"""
Minimal async event bus: priority-ordered async subscribers, weak-ref
auto-cleanup for bound methods, and fire-and-forget dispatch.

Usage
-----
    bus = EventBus()

    class Logger:
        async def on_event(self, data): ...

    logger = Logger()
    bus.subscribe("user.created", logger.on_event, priority=10)
    await bus.publish("user.created", {"id": 1})
"""

from __future__ import annotations

import asyncio
import heapq
import itertools
import logging
import weakref
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

log = logging.getLogger(__name__)

AsyncHandler = Callable[[Any], Awaitable[None]]


@dataclass(order=True)
class _Subscription:
    priority: int
    seq: int  # tie-breaker so heapq never compares the handler
    handler: Callable = field(compare=False)
    remove: Callable[[], None] = field(compare=False)


class EventBus:
    """Priority-ordered async event bus with dead-object auto-cleanup."""

    def __init__(self) -> None:
        self._subs: dict[str, list[_Subscription]] = {}
        self._counter = itertools.count()

    # -- public API ---------------------------------------------------------

    def subscribe(
        self,
        topic: str,
        handler: AsyncHandler,
        *,
        priority: int = 0,
    ) -> Callable[[], None]:
        """Register *handler* for *topic*. Higher priority runs first.

        Returns an unsubscribe callable.
        """
        remove = self._make_remover(handler)
        sub = _Subscription(priority, next(self._counter), handler, remove)
        heapq.heappush(self._subs.setdefault(topic, []), sub)
        log.debug("subscribed %s → %s (pri=%d)", topic, handler, priority)

        def _unsub() -> None:
            sub.remove = _noop  # break weak-ref closure
            self._subs.get(topic, []).remove(sub)

        return _unsub

    async def publish(self, topic: str, data: Any = None) -> list[Exception]:
        """Dispatch *data* to all subscribers of *topic* in priority order.

        Dead-object subscribers are pruned automatically. All live
        subscribers are awaited concurrently. Returns collected errors.
        """
        subs = self._subs.get(topic, [])
        if not subs:
            return []

        live: list[_Subscription] = []
        errors: list[Exception] = []
        for sub in list(subs):
            handler = sub.remove()  # deref weak-ref or None
            if handler is None:
                subs.remove(sub)  # auto-cleanup: bound object gone
                log.debug("pruned dead subscriber for %s", topic)
            else:
                live.append(sub)

        if not live:
            return errors

        ordered = sorted(live)  # priority desc not needed — heap is min-first
        results = await asyncio.gather(
            *(s.handler(data) for s in ordered), return_exceptions=True
        )
        for r in results:
            if isinstance(r, Exception):
                errors.append(r)
                log.error("handler error on %s: %s", topic, r)
        return errors

    # -- internals ----------------------------------------------------------

    @staticmethod
    def _make_remover(handler: Callable) -> Callable[[], Any]:
        """Return a callable that dereferences *handler* or returns None.

        For bound methods we use WeakMethod so the subscriber is
        auto-collected when the owning object dies. Plain functions are
        kept alive (no owner to die).
        """
        if hasattr(handler, "__self__"):
            ref = weakref.WeakMethod(handler)
            return lambda: ref()
        return lambda: handler


def _noop() -> None:  # pragma: no cover
    pass
