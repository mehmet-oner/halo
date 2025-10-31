'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { findDuplicateIndexes, uniquePreserveOrder } from "@/utils/list";
import type { GroupTodoListRecord } from "@/types/todos";

type GroupTodosProps = {
  groupId: string;
};

const MAX_TODO_ITEMS = 10;
const MIN_TODO_ITEMS = 1;
const TODO_POLL_INTERVAL_MS = 5_000;

export default function GroupTodos({ groupId }: GroupTodosProps) {
  const [todoLists, setTodoLists] = useState<GroupTodoListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTodo, setShowCreateTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoItems, setNewTodoItems] = useState<string[]>(['', '']);
  const [todoValidationError, setTodoValidationError] = useState<string | null>(null);
  const [todoDraftItems, setTodoDraftItems] = useState<Record<string, string>>({});
  const [creatingList, setCreatingList] = useState(false);
  const [pendingListIds, setPendingListIds] = useState<Set<string>>(new Set());
  const setListPending = useCallback((listId: string, pending: boolean) => {
    setPendingListIds((previous) => {
      const next = new Set(previous);
      if (pending) {
        next.add(listId);
      } else {
        next.delete(listId);
      }
      return next;
    });
  }, []);

  const fetchTodoLists = useCallback(async (): Promise<GroupTodoListRecord[]> => {
    const response = await fetch(`/api/groups/${groupId}/todos`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        typeof payload.error === 'string' ? payload.error : 'Unable to load group lists.';
      throw new Error(errorMessage);
    }

    return Array.isArray(payload.lists) ? payload.lists : [];
  }, [groupId]);

  const refreshTodoLists = useCallback(async () => {
    try {
      const lists = await fetchTodoLists();
      setTodoLists(lists);
      setError(null);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : 'Unable to load group lists.';
      setError(message);
    }
  }, [fetchTodoLists]);

  const trimmedTodoTitle = newTodoTitle.trim();
  const trimmedTodoItems = useMemo(
    () => newTodoItems.map((item) => item.trim()),
    [newTodoItems]
  );

  const duplicateTodoItemIndexes = useMemo(
    () => findDuplicateIndexes(trimmedTodoItems),
    [trimmedTodoItems]
  );

  const todoHasDuplicateItems = duplicateTodoItemIndexes.size > 0;
  const todoHasMinimumItems = trimmedTodoItems.filter(Boolean).length >= MIN_TODO_ITEMS;
  const todoCreateDisabled = !trimmedTodoTitle || !todoHasMinimumItems || todoHasDuplicateItems;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const lists = await fetchTodoLists();
        if (!cancelled) {
          setTodoLists(lists);
        }
      } catch (loadError) {
        if (cancelled) return;
        const message =
          loadError instanceof Error ? loadError.message : 'Unable to load group lists.';
        setError(message);
        setTodoLists([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchTodoLists]);

  useEffect(() => {
    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (creatingList || pendingListIds.size > 0) {
        return;
      }
      void refreshTodoLists();
    };

    const interval = window.setInterval(poll, TODO_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [creatingList, pendingListIds, refreshTodoLists]);

  useEffect(() => {
    if (!todoValidationError) return;
    if (!todoCreateDisabled) {
      setTodoValidationError(null);
    }
  }, [todoCreateDisabled, todoValidationError]);

  const resetTodoComposer = () => {
    setNewTodoTitle('');
    setNewTodoItems(['', '']);
    setTodoValidationError(null);
  };

  const addTodoComposerItem = () => {
    setNewTodoItems((previous) => (previous.length < MAX_TODO_ITEMS ? [...previous, ''] : previous));
  };

  const updateTodoComposerItem = (index: number, value: string) => {
    setNewTodoItems((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const removeTodoComposerItem = (index: number) => {
    setNewTodoItems((previous) => {
      if (previous.length <= MIN_TODO_ITEMS) return previous;
      return previous.filter((_, idx) => idx !== index);
    });
  };

  const createTodoList = async () => {
    if (todoCreateDisabled) {
      setTodoValidationError('Add a title and at least one unique item.');
      return;
    }

    const uniqueItems = uniquePreserveOrder(trimmedTodoItems);

    setCreatingList(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTodoTitle,
          items: uniqueItems,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const problem =
          typeof payload.error === 'string' ? payload.error : 'Unable to create list.';
        throw new Error(problem);
      }

      const list = payload.list as GroupTodoListRecord | undefined;
      if (list) {
        setTodoLists((previous) => [list, ...previous]);
      } else {
        await refreshTodoLists();
      }

      setShowCreateTodo(false);
      resetTodoComposer();
      setTodoValidationError(null);
      setError(null);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : 'Unable to create list.';
      setTodoValidationError(message);
    } finally {
      setCreatingList(false);
    }
  };

  const deleteTodoList = async (listId: string) => {
    setListPending(listId, true);
    try {
      const response = await fetch(`/api/groups/${groupId}/todos/${listId}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const problem =
          typeof payload.error === 'string' ? payload.error : 'Unable to delete list.';
        throw new Error(problem);
      }

      setTodoLists((previous) => previous.filter((list) => list.id !== listId));
      setTodoDraftItems((previous) => {
        const next = { ...previous };
        delete next[listId];
        return next;
      });
      setError(null);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete list.';
      setError(message);
      await refreshTodoLists();
    } finally {
      setListPending(listId, false);
    }
  };

  const toggleTodoItem = async (listId: string, itemId: string) => {
    const list = todoLists.find((candidate) => candidate.id === listId);
    const targetItem = list?.items.find((item) => item.id === itemId);
    if (!list || !targetItem) return;

    const nextCompleted = !targetItem.completed;
    setListPending(listId, true);
    setTodoLists((previous) =>
      previous.map((candidate) =>
        candidate.id === listId
          ? {
              ...candidate,
              items: candidate.items.map((item) =>
                item.id === itemId ? { ...item, completed: nextCompleted } : item
              ),
            }
          : candidate
      )
    );

    try {
      const response = await fetch(
        `/api/groups/${groupId}/todos/${listId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: nextCompleted }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const problem =
          typeof payload.error === 'string' ? payload.error : 'Unable to update item.';
        throw new Error(problem);
      }

      const updatedList = payload.list as GroupTodoListRecord | undefined;
      if (updatedList) {
        setTodoLists((previous) =>
          previous.map((candidate) => (candidate.id === listId ? updatedList : candidate))
        );
      } else {
        await refreshTodoLists();
      }
      setError(null);
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : 'Unable to update item.';
      setError(message);
      await refreshTodoLists();
    } finally {
      setListPending(listId, false);
    }
  };

  const removeTodoItem = async (listId: string, itemId: string) => {
    const list = todoLists.find((candidate) => candidate.id === listId);
    if (!list) return;

    setListPending(listId, true);
    setTodoLists((previous) =>
      previous.map((candidate) =>
        candidate.id === listId
          ? {
              ...candidate,
              items: candidate.items.filter((item) => item.id !== itemId),
            }
          : candidate
      )
    );

    try {
      const response = await fetch(
        `/api/groups/${groupId}/todos/${listId}/items/${itemId}`,
        { method: 'DELETE' }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const problem =
          typeof payload.error === 'string' ? payload.error : 'Unable to delete item.';
        throw new Error(problem);
      }

      const updatedList = payload.list as GroupTodoListRecord | undefined;
      if (updatedList) {
        setTodoLists((previous) =>
          previous.map((candidate) => (candidate.id === listId ? updatedList : candidate))
        );
      } else {
        await refreshTodoLists();
      }
      setError(null);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Unable to delete item.';
      setError(message);
      await refreshTodoLists();
    } finally {
      setListPending(listId, false);
    }
  };

  const moveTodoItem = async (
    listId: string,
    itemId: string,
    direction: 'up' | 'down'
  ) => {
    const list = todoLists.find((candidate) => candidate.id === listId);
    if (!list) return;

    const index = list.items.findIndex((item) => item.id === itemId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.items.length) {
      return;
    }

    const reordered = [...list.items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setListPending(listId, true);
    setTodoLists((previous) =>
      previous.map((candidate) =>
        candidate.id === listId ? { ...candidate, items: reordered } : candidate
      )
    );

    try {
      const response = await fetch(`/api/groups/${groupId}/todos/${listId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: reordered.map((item) => item.id),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const problem =
          typeof payload.error === 'string' ? payload.error : 'Unable to reorder items.';
        throw new Error(problem);
      }

      const updatedList = payload.list as GroupTodoListRecord | undefined;
      if (updatedList) {
        setTodoLists((previous) =>
          previous.map((candidate) => (candidate.id === listId ? updatedList : candidate))
        );
      } else {
        await refreshTodoLists();
      }
      setError(null);
    } catch (reorderError) {
      const message =
        reorderError instanceof Error ? reorderError.message : 'Unable to reorder items.';
      setError(message);
      await refreshTodoLists();
    } finally {
      setListPending(listId, false);
    }
  };

  const updateDraftItem = (listId: string, value: string) => {
    setTodoDraftItems((previous) => ({ ...previous, [listId]: value }));
  };

  const addTodoItemToList = async (listId: string) => {
    const draftRaw = todoDraftItems[listId] ?? '';
    const draft = draftRaw.trim();
    if (!draft) return;

    const list = todoLists.find((candidate) => candidate.id === listId);
    if (!list) return;

    if (list.items.length >= MAX_TODO_ITEMS) {
      setError(`Lists can include up to ${MAX_TODO_ITEMS} tasks.`);
      return;
    }

    if (list.items.some((item) => item.label.toLowerCase() === draft.toLowerCase())) {
      setError('That item is already on the list.');
      return;
    }

    setListPending(listId, true);
    try {
      const response = await fetch(`/api/groups/${groupId}/todos/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: draft }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const problem =
          typeof payload.error === 'string' ? payload.error : 'Unable to add item.';
        throw new Error(problem);
      }

      const updatedList = payload.list as GroupTodoListRecord | undefined;
      if (updatedList) {
        setTodoLists((previous) =>
          previous.map((candidate) => (candidate.id === listId ? updatedList : candidate))
        );
      } else {
        await refreshTodoLists();
      }

      setTodoDraftItems((previous) => ({ ...previous, [listId]: '' }));
      setError(null);
    } catch (insertError) {
      const message =
        insertError instanceof Error ? insertError.message : 'Unable to add item.';
      setError(message);
    } finally {
      setListPending(listId, false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
            <ListTodo size={18} />
            Group lists
          </h2>
        </div>
        <button
          onClick={() => {
            setShowCreateTodo(true);
            setTodoValidationError(null);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/80"
          aria-label="Create to-do list"
        >
          <Plus size={18} />
        </button>
      </div>

      {showCreateTodo && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-inner">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">New list</h3>
          <input
            type="text"
            value={newTodoTitle}
            onChange={(event) => setNewTodoTitle(event.target.value)}
            placeholder="What should we tackle?"
            className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
          />

          <div className="space-y-2">
            {newTodoItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(event) => updateTodoComposerItem(index, event.target.value)}
                  placeholder={`Item ${index + 1}`}
                  className={`flex-1 rounded-xl border bg-white px-4 py-3 text-sm text-slate-700 transition focus:outline-none focus:ring-1 ${
                    duplicateTodoItemIndexes.has(index)
                      ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200/60'
                      : 'border-slate-200 focus:border-stone-500 focus:ring-stone-400/60'
                  }`}
                />
                {newTodoItems.length > MIN_TODO_ITEMS && (
                  <button
                    onClick={() => removeTodoComposerItem(index)}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Remove task"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {(todoValidationError || todoHasDuplicateItems) && (
            <p className="mt-3 text-xs text-rose-500">
              {todoValidationError ?? 'Tasks must be unique.'}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            {newTodoItems.length < MAX_TODO_ITEMS && (
            <button
              onClick={addTodoComposerItem}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
              type="button"
            >
              + Add item
            </button>
            )}
            <button
              onClick={() => void createTodoList()}
              disabled={todoCreateDisabled || creatingList}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:bg-slate-200 disabled:text-slate-400"
              type="button"
            >
              <span className="flex items-center justify-center gap-2">
                {creatingList && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Create list</span>
              </span>
            </button>
            <button
              onClick={() => {
                setShowCreateTodo(false);
                resetTodoComposer();
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100/80"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Loading to-dos…
        </div>
      ) : todoLists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500">
          No shared lists yet.
        </div>
      ) : (
        <div className="space-y-4">
          {todoLists.map((list) => {
            const isPending = pendingListIds.has(list.id);
            const draftValue = todoDraftItems[list.id] ?? '';
            const trimmedDraft = draftValue.trim();

            return (
              <div key={list.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{list.title}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(list.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => void deleteTodoList(list.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:bg-slate-100/70 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>

                <div className="space-y-2">
                  {list.items.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === list.items.length - 1;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => void toggleTodoItem(list.id, item.id)}
                          disabled={isPending}
                          className={`flex flex-1 items-center gap-3 text-left transition ${
                            item.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                          } ${isPending ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                              item.completed
                                ? 'border-slate-400 bg-slate-200 text-slate-600'
                                : 'border-slate-300 text-transparent'
                            }`}
                            aria-hidden
                          >
                            <Check size={14} />
                          </span>
                          <span>{item.label}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void moveTodoItem(list.id, item.id, 'up')}
                            disabled={isFirst || isPending}
                            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-200"
                            aria-label="Move item up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void moveTodoItem(list.id, item.id, 'down')}
                            disabled={isLast || isPending}
                            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-200"
                            aria-label="Move item down"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeTodoItem(list.id, item.id)}
                            disabled={isPending}
                            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-200"
                            aria-label="Remove task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={draftValue}
                    onChange={(event) => updateDraftItem(list.id, event.target.value)}
                    placeholder="Add an item"
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <button
                    onClick={() => void addTodoItemToList(list.id)}
                    disabled={isPending || trimmedDraft.length === 0}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-4 text-xs text-rose-500">
          {error}
        </p>
      )}
    </section>
  );
}
