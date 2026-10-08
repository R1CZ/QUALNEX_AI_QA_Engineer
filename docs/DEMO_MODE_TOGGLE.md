# Demo Mode Toggle Guide

## 🎛️ Where to Find the Toggle

The **Demo/Live Mode Toggle** is located in the **top-right corner** of the application header, next to the "System Online" status indicator.

![Toggle Location](top-right-header)

## 🔄 How to Use It

### Switching Modes

1. **Look at the top-right** of any page after logging in
2. **Click the toggle button** that shows either:
   - 🟡 **"Demo"** (amber color) - Currently showing sample data
   - 🟢 **"Live"** (green color) - Currently in live/empty mode

3. **Click to switch** between modes:
   - **Demo Mode** → Shows sample projects, QA runs, bugs, and QA cases
   - **Live Mode** → Shows empty state, ready for real backend data

### Visual Indicators

**Demo Mode (Active):**
```
[🟠 Demo] [● System Online]
```
- Amber/orange toggle icon
- "Demo" label in amber
- Sample data populated throughout the app

**Live Mode (Active):**
```
[🟢 Live] [● System Online]
```
- Green toggle icon
- "Live" label in green
- Empty states shown (no data)

## 💾 Persistence

Your mode preference is **automatically saved** in your browser's localStorage:
- Key: `qualnex_demo_mode`
- Value: `true` (demo) or `false` (live)
- Persists across browser sessions
- Defaults to **Demo Mode** on first visit

## 🎯 What Changes Between Modes

### Demo Mode
- ✅ Dashboard shows sample statistics
- ✅ Projects list shows 3 example projects
- ✅ QA Runs shows 2 sample runs (1 completed, 1 in progress)
- ✅ Bugs shows 4 validated bugs with evidence
- ✅ QA Cases shows 2 delivered cases
- ✅ Recent activity timeline populated
- ✅ Severity distribution chart with data

### Live Mode
- ⚪ Dashboard shows "No data yet" empty states
- ⚪ Projects shows "Create your first project" prompt
- ⚪ QA Runs shows "No runs yet" message
- ⚪ Bugs shows "No bugs detected" message
- ⚪ QA Cases shows "No cases yet" message
- ⚪ All charts and stats show zero/empty

## 🚀 When to Use Each Mode

### Use Demo Mode When:
- 📚 Exploring the platform for the first time
- 🎨 Reviewing UI/UX design
- 📊 Demonstrating capabilities to stakeholders
- 🧪 Testing navigation and workflows
- 📸 Taking screenshots for documentation

### Use Live Mode When:
- 🔌 Backend API is connected and ready
- 🗄️ Database is populated with real data
- 🏭 Running in production environment
- ✅ Ready to start actual QA operations
- 🔒 Working with real user data

## ⚙️ Technical Details

### State Management
- Stored in React Context: `AppContext`
- Accessible via: `useApp()` hook
- Properties: `isDemoMode`, `toggleDemoMode()`

### Code Example
```typescript
const { isDemoMode, toggleDemoMode } = useApp();

// Check current mode
if (isDemoMode) {
  console.log('Showing demo data');
}

// Toggle mode
toggleDemoMode();
```

### Conditional Rendering
Components can check the mode to show appropriate content:

```typescript
const { isDemoMode, projects } = useApp();

return (
  <div>
    {projects.length === 0 ? (
      isDemoMode ? (
        <DemoEmptyState />
      ) : (
        <LiveEmptyState onCreateProject={handleCreate} />
      )
    ) : (
      <ProjectList projects={projects} />
    )}
  </div>
);
```

## 🎨 Styling

The toggle uses the QUALNEX design system:
- **Background**: `bg-navy-800/50`
- **Border**: `border-navy-700/50`
- **Demo color**: `text-amber-400`
- **Live color**: `text-emerald-400`
- **Hover**: Smooth color transitions
- **Tooltip**: Appears on hover with helpful text

## 🔐 Production Deployment

For production deployments:
1. **Default to Live Mode** by changing the initial state:
   ```typescript
   const [isDemoMode, setIsDemoMode] = useState(false);
   ```

2. **Or remove the toggle entirely** and hardcode to live mode

3. **Or make it admin-only** by checking user role:
   ```typescript
   const { user } = useApp();
   const canToggle = user?.role === 'owner' || user?.role === 'admin';
   ```

## 🐛 Troubleshooting

**Toggle not appearing?**
- Check that you're logged in
- Verify you're on an `/app/*` route (not landing or login page)
- Clear browser cache and reload

**Mode not persisting?**
- Check browser localStorage is enabled
- Look for `qualnex_demo_mode` key in DevTools → Application → Local Storage
- Try manually setting: `localStorage.setItem('qualnex_demo_mode', 'true')`

**Data not changing?**
- Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)
- Check browser console for errors
- Verify AppContext is properly wrapped in App.tsx

## 📝 Notes

- The toggle only affects **data display**, not actual backend operations
- In Live Mode, the app will attempt to fetch from the API (if configured)
- Demo data is hardcoded in `AppContext.tsx` for reference
- Real data would come from the FastAPI backend endpoints
- The toggle is purely a **frontend UX feature**

---

**Need help?** Check the main [README.md](../README.md) for system architecture and deployment instructions.
