"""
truePin Skills Registry
-----------------------
A lightweight in-process skills registry that lets any agent runtime
(or MCP tool-caller) discover and invoke named skills with typed I/O.

Pattern:
    skill_registry.register(MySkill())
    result = await skill_registry.execute("skill_name", param1=..., param2=...)
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Base Skill
# ---------------------------------------------------------------------------

class Skill(ABC):
    """Abstract base class that every truePin skill must inherit from."""

    #: Short snake_case identifier — used as the MCP tool name too
    name: str
    #: One-line human description shown in /api/skills and MCP tool listing
    description: str
    #: Semantic version string
    version: str = "1.0.0"
    #: JSON-Schema-compatible dict describing accepted kwargs
    input_schema: Dict[str, Any] = {}

    @abstractmethod
    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Run the skill and return a structured result dict."""

    def to_manifest(self) -> Dict[str, Any]:
        """Return a JSON-serialisable manifest for /api/skills listing."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "input_schema": self.input_schema,
        }


# ---------------------------------------------------------------------------
# Registry Singleton
# ---------------------------------------------------------------------------

class SkillsRegistry:
    """
    Central registry for all truePin skills.

    Usage::

        skill_registry.register(TrustScorerSkill())
        result = await skill_registry.execute("trust_scorer", lat=28.63, ...)
    """

    def __init__(self) -> None:
        self._skills: Dict[str, Skill] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register(self, skill: Skill) -> None:
        """Add a skill to the registry.  Raises ValueError on duplicate names."""
        if skill.name in self._skills:
            raise ValueError(f"Skill '{skill.name}' is already registered.")
        self._skills[skill.name] = skill

    def unregister(self, name: str) -> None:
        """Remove a skill by name (useful in tests)."""
        self._skills.pop(name, None)

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------

    def list_all(self) -> List[Dict[str, Any]]:
        """Return manifests for every registered skill."""
        return [s.to_manifest() for s in self._skills.values()]

    def get(self, name: str) -> Optional[Skill]:
        return self._skills.get(name)

    def names(self) -> List[str]:
        return list(self._skills.keys())

    def __contains__(self, name: str) -> bool:
        return name in self._skills

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def execute(self, skill_name: str, **kwargs: Any) -> Dict[str, Any]:
        """
        Execute a named skill and return its result dict.

        Always includes top-level metadata:
            skill_name, executed_at_ms (epoch), duration_ms, success, error
        """
        skill = self._skills.get(skill_name)
        if skill is None:
            return {
                "skill_name": skill_name,
                "success": False,
                "error": f"Unknown skill '{skill_name}'. "
                         f"Available: {self.names()}",
            }

        t0 = time.perf_counter()
        try:
            result = await skill.execute(**kwargs)
            return {
                "skill_name": skill_name,
                "success": True,
                "executed_at_ms": int(time.time() * 1000),
                "duration_ms": round((time.perf_counter() - t0) * 1000, 2),
                **result,
            }
        except Exception as exc:  # pylint: disable=broad-except
            return {
                "skill_name": skill_name,
                "success": False,
                "executed_at_ms": int(time.time() * 1000),
                "duration_ms": round((time.perf_counter() - t0) * 1000, 2),
                "error": str(exc),
            }


# ---------------------------------------------------------------------------
# Module-level singleton — import this everywhere
# ---------------------------------------------------------------------------
skill_registry = SkillsRegistry()
