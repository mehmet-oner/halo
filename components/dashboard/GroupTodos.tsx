'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ListTodo,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

type TodoItem = {
  id: string;
  label: string;
  completed: boolean;
};

type TodoList = {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  items: TodoItem[];
};

type GroupTodosProps = {
  userId: string;
  groupId: string;
};

const MAX_TODO_ITEMS = 10;
const MIN_TODO_ITEMS = 1;

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const createSeedTodos = (userId: string, groupId: string): TodoList[] => {
  const now = new Date().toISOString();
  const shortCode = groupId.slice(0, 4).toUpperCase();

  return [
    {
      id: generateId(),
      title: `Weekend hangout prep (${shortCode})`,
      createdBy: userId,
      createdAt: now,
      items: [
        { id: generateId(), label: 'Pick a park for the picnic', completed: true },
        { id: generateId(), label: 'Bring snacks and drinks', completed: false },
        { id: generateId(), label: 'Charge the speaker', completed: false },
      ],
    },
  ];
};

export default function GroupTodos({ userId, groupId }: GroupTodosProps) {
  const [todoLists, setTodoLists] = useState<TodoList[]>(() => createSeedTodos(userId, groupId));
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTodo, setShowCreateTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoItems, setNewTodoItems] = useState<string[]>(['', '']);
  const [todoValidationError, setTodoValidationError] = useState<string | null>(null);
  const [todoDraftItems, setTodoDraftItems] = useState<Record<string, string>>({});

  const trimmedTodoTitle = newTodoTitle.trim();
  const trimmedTodoItems = useMemo(
    () => newTodoItems.map((item) => item.trim()),
    [newTodoItems]
  );

  const duplicateTodoItemIndexes = useMemo(() => {
    const counts = new Map<string, number>();
    trimmedTodoItems.forEach((item) => {
      if (!item) return;
      const normalized = item.toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });

    const duplicates = new Set<number>();
    trimmedTodoItems.forEach((item, index) => {
      if (!item) return;
      const normalized = item.toLowerCase();
      if ((counts.get(normalized) ?? 0) > 1) {
        duplicates.add(index);
      }
    });

    return duplicates;
  }, [trimmedTodoItems]);

  const todoHasDuplicateItems = duplicateTodoItemIndexes.size > 0;
  const todoHasMinimumItems = trimmedTodoItems.filter(Boolean).length >= MIN_TODO_ITEMS;
  const todoCreateDisabled = !trimmedTodoTitle || !todoHasMinimumItems || todoHasDuplicateItems;

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

  const createTodoList = () => {
    if (todoCreateDisabled) {
      setTodoValidationError('Add a title and at least one unique item.');
      return;
    }

    const uniqueItems = Array.from(
      new Map(
        trimmedTodoItems
          .filter(Boolean)
          .map((label) => [label.toLowerCase(), { id: generateId(), label, completed: false }])
      ).values()
    );

    const list: TodoList = {
      id: generateId(),
      title: trimmedTodoTitle,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      items: uniqueItems,
    };

    setTodoLists((previous) => [list, ...previous]);
    setShowCreateTodo(false);
    resetTodoComposer();
  };

  const deleteTodoList = (listId: string) => {
    setTodoLists((previous) => previous.filter((list) => list.id !== listId));
    setTodoDraftItems((previous) => {
      const next = { ...previous };
      delete next[listId];
      return next;
    });
  };

  const toggleTodoItem = (listId: string, itemId: string) => {
    setTodoLists((previous) =>
      previous.map((list) => {
        if (list.id !== listId) return list;
        return {
          ...list,
          items: list.items.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          ),
        };
      })
    );
  };

  const removeTodoItem = (listId: string, itemId: string) => {
    setTodoLists((previous) =>
      previous.map((list) => {
        if (list.id !== listId) return list;
        const nextItems = list.items.filter((item) => item.id !== itemId);
        return {
          ...list,
          items: nextItems.length ? nextItems : list.items,
        };
      })
    );
  };

  const moveTodoItem = (listId: string, itemId: string, direction: 'up' | 'down') => {
    setTodoLists((previous) =>
      previous.map((list) => {
        if (list.id !== listId) return list;
        const index = list.items.findIndex((item) => item.id === itemId);
        if (index === -1) return list;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= list.items.length) {
          return list;
        }

        const nextItems = [...list.items];
        const [moved] = nextItems.splice(index, 1);
        nextItems.splice(targetIndex, 0, moved);

        return {
          ...list,
          items: nextItems,
        };
      })
    );
  };

  const updateDraftItem = (listId: string, value: string) => {
    setTodoDraftItems((previous) => ({ ...previous, [listId]: value }));
  };

  const addTodoItemToList = (listId: string) => {
    setTodoLists((previous) =>
      previous.map((list) => {
        if (list.id !== listId) return list;
        const draft = todoDraftItems[listId]?.trim();
        if (!draft) return list;
        if (list.items.some((item) => item.label.toLowerCase() === draft.toLowerCase())) {
          setError('That item is already on the list.');
          return list;
        }
        const nextItems = [
          ...list.items,
          {
            id: generateId(),
            label: draft,
            completed: false,
          },
        ];
        return {
          ...list,
          items: nextItems,
        };
      })
    );
    setTodoDraftItems((previous) => ({ ...previous, [listId]: '' }));
    setError(null);
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
              >
                + Add item
              </button>
            )}
            <button
              onClick={createTodoList}
              disabled={todoCreateDisabled}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition disabled:bg-slate-200 disabled:text-slate-400"
            >
              Create list
            </button>
            <button
              onClick={() => {
                setShowCreateTodo(false);
                resetTodoComposer();
              }}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100/80"
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
          {todoLists.map((list) => (
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
                  onClick={() => deleteTodoList(list.id)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:bg-slate-100/70"
                >
                  <Trash2 size={14} />
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
                        onClick={() => toggleTodoItem(list.id, item.id)}
                        className={`flex flex-1 items-center gap-3 text-left transition ${
                          item.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
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
                          onClick={() => moveTodoItem(list.id, item.id, 'up')}
                          disabled={isFirst}
                          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-200"
                          aria-label="Move item up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTodoItem(list.id, item.id, 'down')}
                          disabled={isLast}
                          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-200"
                          aria-label="Move item down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTodoItem(list.id, item.id)}
                          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                  value={todoDraftItems[list.id] ?? ''}
                  onChange={(event) => updateDraftItem(list.id, event.target.value)}
                  placeholder="Add an item"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-400/60"
                />
                <button
                  onClick={() => addTodoItemToList(list.id)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-100/70"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
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
