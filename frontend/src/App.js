import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { tasksAPI, adminAPI } from './utils/api';

// ── Inline styles (no external CSS needed) ──────────────────────────────────
const theme = {
  bg: '#0f0f0f',
  surface: '#1a1a1a',
  card: '#222',
  border: '#333',
  accent: '#6c63ff',
  accentHover: '#7c75ff',
  success: '#22c55e',
  danger: '#ef4444',
  warn: '#f59e0b',
  text: '#f4f4f4',
  muted: '#888',
  input: '#1a1a1a',
};

// ── Toast ──────────────────────────────────────────────────────────────────
let toastId = 0;
const toastHandlers = [];
export function toast(msg, type = 'info') {
  toastHandlers.forEach(h => h({ id: ++toastId, msg, type }));
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3000);
    };
    toastHandlers.push(handler);
    return () => toastHandlers.splice(toastHandlers.indexOf(handler), 1);
  }, []);
  const colors = { success: theme.success, error: theme.danger, info: theme.accent };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: theme.card, border: `1px solid ${colors[t.type] || theme.border}`, color: theme.text, padding: '10px 16px', borderRadius: 8, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 320 }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Auth pages ─────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
        toast('Welcome back!', 'success');
      } else {
        await register(form);
        toast('Account created!', 'success');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '10px 12px', background: theme.input, border: `1px solid ${theme.border}`,
    borderRadius: 8, color: theme.text, fontSize: 14, boxSizing: 'border-box', outline: 'none',
  };
  const btn = {
    width: '100%', padding: '11px', background: theme.accent, border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.accent, letterSpacing: -1 }}>TaskFlow</div>
          <div style={{ color: theme.muted, fontSize: 13, marginTop: 4 }}>REST API Demo Dashboard</div>
        </div>

        <div style={{ display: 'flex', marginBottom: 24, background: theme.surface, borderRadius: 8, padding: 3 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, fontSize: 13,
              fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              background: mode === m ? theme.accent : 'transparent',
              color: mode === m ? '#fff' : theme.muted,
            }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <input style={inp} placeholder="Full name" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          )}
          <input style={inp} type="email" placeholder="Email address" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <input style={inp} type="password" placeholder="Password (min 6 chars)" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          {mode === 'register' && (
            <select style={{ ...inp }} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          )}
          <button type="submit" style={{ ...btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: '12px', background: theme.surface, borderRadius: 8, fontSize: 12, color: theme.muted, lineHeight: 1.6 }}>
          <strong style={{ color: theme.text }}>Demo hint:</strong> Register with role "admin" to unlock admin features (view all users, stats panel).
        </div>
      </div>
    </div>
  );
}

// ── Task form modal ────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    tags: task?.tags?.join(', ') || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (task) {
        await tasksAPI.update(task._id, data);
        toast('Task updated!', 'success');
      } else {
        await tasksAPI.create(data);
        toast('Task created!', 'success');
      }
      onSave();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save task', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '9px 12px', background: theme.input, border: `1px solid ${theme.border}`,
    borderRadius: 8, color: theme.text, fontSize: 13, boxSizing: 'border-box', outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 460, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: theme.text }}>{task ? 'Edit task' : 'New task'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inp} placeholder="Task title *" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} placeholder="Description"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select style={inp} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select style={inp} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
          </div>
          <input style={inp} type="date" value={form.dueDate}
            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          <input style={inp} placeholder="Tags (comma separated)" value={form.tags}
            onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
          <button type="submit" style={{
            padding: '10px', background: theme.accent, border: 'none', borderRadius: 8,
            color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1,
          }} disabled={loading}>
            {loading ? 'Saving…' : task ? 'Update task' : 'Create task'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Status + Priority badges ───────────────────────────────────────────────
const statusColors = { todo: '#334155', 'in-progress': '#1e3a5f', completed: '#14532d' };
const statusText = { todo: '#94a3b8', 'in-progress': '#60a5fa', completed: '#4ade80' };
const priorityColors = { low: '#4ade80', medium: '#f59e0b', high: '#ef4444' };

function Badge({ label, bg, color }) {
  return (
    <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 500 }}>
      {label}
    </span>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | task obj
  const [tab, setTab] = useState('tasks'); // 'tasks' | 'admin'
  const [adminData, setAdminData] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 8, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const res = await tasksAPI.getAll(params);
      setTasks(res.data.data);
      setMeta(res.data.pagination);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchAdmin = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [statsRes, usersRes] = await Promise.all([adminAPI.getStats(), adminAPI.getUsers()]);
      setAdminData(statsRes.data.data);
      setAdminUsers(usersRes.data.data);
    } catch (err) {
      toast('Failed to load admin data', 'error');
    }
  }, [isAdmin]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (tab === 'admin') fetchAdmin(); }, [tab, fetchAdmin]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      toast('Task deleted', 'success');
      fetchTasks();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const navBtn = (label, t) => (
    <button onClick={() => setTab(t)} style={{
      padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
      background: tab === t ? theme.accent : 'transparent', color: tab === t ? '#fff' : theme.muted,
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <div style={{ background: theme.card, borderBottom: `1px solid ${theme.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: theme.accent, marginRight: 8 }}>TaskFlow</div>
        {navBtn('My Tasks', 'tasks')}
        {isAdmin && navBtn('Admin', 'admin')}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 13, color: theme.muted }}>
          <span style={{ color: theme.text }}>{user?.name}</span>
          {' '}
          <span style={{ background: isAdmin ? '#3b0764' : '#1e3a5f', color: isAdmin ? '#c084fc' : '#60a5fa', padding: '2px 7px', borderRadius: 4, fontSize: 11, marginLeft: 4 }}>
            {user?.role}
          </span>
        </div>
        <button onClick={logout} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.muted, padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>
        {tab === 'tasks' && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Search tasks…" value={filters.search}
                onChange={e => { setFilters(p => ({ ...p, search: e.target.value })); setPage(1); }}
                style={{ padding: '8px 12px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, fontSize: 13, width: 200, outline: 'none' }} />
              <select value={filters.status} onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }}
                style={{ padding: '8px 10px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, fontSize: 13, outline: 'none' }}>
                <option value="">All statuses</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select value={filters.priority} onChange={e => { setFilters(p => ({ ...p, priority: e.target.value })); setPage(1); }}
                style={{ padding: '8px 10px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, fontSize: 13, outline: 'none' }}>
                <option value="">All priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <div style={{ flex: 1 }} />
              <button onClick={() => setModal('create')} style={{
                padding: '8px 16px', background: theme.accent, border: 'none', borderRadius: 8,
                color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13,
              }}>+ New Task</button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total', value: meta.total, color: theme.accent },
                { label: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
                { label: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#60a5fa' },
                { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#4ade80' },
              ].map(s => (
                <div key={s.label} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Task list */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: theme.muted }}>Loading tasks…</div>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: theme.muted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16 }}>No tasks yet. Create your first one!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map(task => (
                  <div key={task._id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, fontSize: 14, color: task.status === 'completed' ? theme.muted : theme.text, textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                          {task.title}
                        </span>
                        <Badge label={task.status} bg={statusColors[task.status]} color={statusText[task.status]} />
                        <Badge label={task.priority} bg="transparent" color={priorityColors[task.priority]} />
                        {task.isOverdue && <Badge label="overdue" bg="#450a0a" color="#fca5a5" />}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: theme.muted, marginBottom: 4 }}>{task.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {task.dueDate && (
                          <span style={{ fontSize: 11, color: theme.muted }}>
                            Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {task.tags?.map(tag => (
                          <span key={tag} style={{ fontSize: 11, background: '#1e293b', color: '#7dd3fc', padding: '1px 7px', borderRadius: 4 }}>#{tag}</span>
                        ))}
                        {isAdmin && task.owner?.name && (
                          <span style={{ fontSize: 11, color: theme.muted }}>by {task.owner.name}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setModal(task)} style={{ padding: '5px 10px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 6, color: theme.muted, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                      <button onClick={() => handleDelete(task._id)} style={{ padding: '5px 10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, color: '#fca5a5', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                {Array.from({ length: meta.pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} style={{
                    width: 34, height: 34, borderRadius: 7, border: `1px solid ${theme.border}`,
                    background: page === p ? theme.accent : theme.surface,
                    color: page === p ? '#fff' : theme.muted, cursor: 'pointer', fontSize: 13,
                  }}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'admin' && isAdmin && (
          <div>
            {adminData && (
              <>
                <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 16 }}>Platform stats</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
                  <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '16px' }}>
                    <div style={{ fontSize: 12, color: theme.muted }}>Total users</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: theme.accent }}>{adminData.userCount}</div>
                  </div>
                  <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '16px' }}>
                    <div style={{ fontSize: 12, color: theme.muted }}>Total tasks</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#60a5fa' }}>{adminData.taskCount}</div>
                  </div>
                  <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '16px' }}>
                    <div style={{ fontSize: 12, color: theme.muted }}>Tasks by status</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {adminData.tasksByStatus?.map(s => (
                        <span key={s._id} style={{ fontSize: 12, background: statusColors[s._id] || theme.surface, color: statusText[s._id] || theme.muted, padding: '2px 8px', borderRadius: 5 }}>
                          {s._id}: {s.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>All users ({adminUsers.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {adminUsers.map(u => (
                <div key={u._id} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.role === 'admin' ? '#3b0764' : '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.role === 'admin' ? '#c084fc' : '#60a5fa', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: theme.muted }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 11, background: u.role === 'admin' ? '#3b0764' : '#1e3a5f', color: u.role === 'admin' ? '#c084fc' : '#60a5fa', padding: '3px 8px', borderRadius: 5 }}>
                    {u.role}
                  </span>
                  {u._id !== user?._id && (
                    <button onClick={async () => {
                      if (!window.confirm('Delete user and all their tasks?')) return;
                      try { await adminAPI.deleteUser(u._id); toast('User deleted', 'success'); fetchAdmin(); }
                      catch (err) { toast(err.response?.data?.message || 'Delete failed', 'error'); }
                    }} style={{ padding: '5px 10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, color: '#fca5a5', cursor: 'pointer', fontSize: 12 }}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchTasks(); }}
        />
      )}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
function AppContent() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        Loading…
      </div>
    );
  }
  return user ? <Dashboard /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <ToastContainer />
    </AuthProvider>
  );
}
