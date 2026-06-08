# UX/Design Improvements Implementation Guide

This guide documents the new UX components added to improve user experience in JobFlowTracker.

## New Components

### 1. SearchFilter Component
**File**: `src/components/SearchFilter.jsx`

Provides text search + filter pills for filtering lists by status.

**Usage**:
```jsx
import SearchFilter from './components/SearchFilter';
import { useToast } from './useToast';

function MyList() {
  const [items, setItems] = useState([...]);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState([]);

  const handleSearch = (text) => {
    setSearchText(text);
    // Filter items by name, role, etc.
    const filtered = items.filter(item =>
      item.name.toLowerCase().includes(text.toLowerCase()) ||
      item.role?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleFilter = (filterIds) => {
    setFilters(filterIds);
    // Filter by status
    const filtered = items.filter(item =>
      filterIds.length === 0 || filterIds.includes(item.status)
    );
    setFilteredItems(filtered);
  };

  return (
    <>
      <SearchFilter
        onSearch={handleSearch}
        onFilterChange={handleFilter}
        placeholder="Search by name, role, location..."
        mode="jobseeker" // or 'recruiter', 'tasks'
      />
      {/* Display filtered items */}
    </>
  );
}
```

**Modes**:
- `jobseeker`: Applied, Interviewing, Rejected, Offer
- `recruiter`: Sourced, Interviewing, Offer, Rejected
- `tasks`: Active, Completed, On Hold

---

### 2. Toast Component
**File**: `src/components/Toast.jsx`

Non-blocking notification system. Perfect for undo actions.

**Types**: `info`, `success`, `error`, `warning`

**Usage**:
```jsx
import Toast from './components/Toast';

function Example() {
  const [toast, setToast] = useState(null);

  const handleDelete = async (item) => {
    // Delete the item
    await deleteItem(item.id);

    // Show undo toast for 5 seconds
    setToast({
      message: `${item.name} deleted`,
      action: 'UNDO',
      type: 'info',
      timeout: 5000,
      onAction: async () => {
        await restoreItem(item); // Restore from backup
        setToast(null);
      },
      onClose: () => setToast(null),
    });
  };

  return (
    <>
      {toast && <Toast {...toast} />}
      <button onClick={() => handleDelete(item)}>Delete</button>
    </>
  );
}
```

---

### 3. useToast Hook
**File**: `src/useToast.js`

Centralized toast management for multiple toasts.

**Usage**:
```jsx
import { useToast } from './useToast';
import Toast from './components/Toast';

function App() {
  const { toasts, addToast, removeToast } = useToast();

  const handleAction = () => {
    addToast({
      message: 'Action completed!',
      type: 'success',
      timeout: 3000,
      onClose: removeToast
    });
  };

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}
```

---

### 4. DeletionConfirm Modal
**File**: `src/components/DeletionConfirm.jsx`

Confirmation dialog for destructive actions. Best used with undo toast pattern instead of blocking the user.

**Usage**:
```jsx
import DeletionConfirm from './components/DeletionConfirm';

function ItemDetail() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    await deleteItem(id);
    setShowConfirm(false);
    onClose();
  };

  return (
    <>
      {showConfirm && (
        <DeletionConfirm
          itemName={item.name}
          itemType="company"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <button onClick={handleDelete}>Delete</button>
    </>
  );
}
```

---

## Integration Tasks

### 1. Add Search to Job Seeker List View
- [ ] Import `SearchFilter` in `JobTrackerApp.jsx`
- [ ] Add state for `searchText` and `activeFilters`
- [ ] Filter companies before rendering the list
- [ ] Test with 100+ items for performance

### 2. Add Search to Recruiter List View
- [ ] Import `SearchFilter` in `JobTrackerApp.jsx`
- [ ] Customize for recruiter mode (source, hiring stage)
- [ ] Add bulk operations bar when items selected

### 3. Replace Delete Confirmations with Undo Toast
- [ ] Replace `confirm()` dialogs with Toast + undo pattern
- [ ] Store deleted item for 5-second undo window
- [ ] Test restore functionality

### 4. Improve Calendar Visibility
- [ ] Add legend with event type colors
- [ ] Add event preview on day cell hover
- [ ] Show count of events per day badge
- [ ] Mobile: Switch to full-day view instead of month grid

### 5. Add Dual-Mode Toggle
- [ ] Add "Hybrid Mode" toggle in Settings
- [ ] Show 2-column layout: Recruiter | Job Seeker
- [ ] Share calendar view across both modes
- [ ] Persist setting in localStorage

### 6. Better Export/Import UX
- [ ] Add descriptive button labels: "📥 Backup Data" and "📤 Restore Backup"
- [ ] Add tooltips: "Export all your data as JSON"
- [ ] Show file size after export
- [ ] Add validation feedback after import

---

## CSS Animation

Add to `src/index.css` for toast animations:

```css
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(100px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

---

## Performance Considerations

- **Search**: Debounce text input to 300ms to avoid re-renders
- **Filters**: Use `useMemo` for filtered list calculation
- **Virtualization**: For lists with 1000+ items, use `react-window`

Example debounced search:

```jsx
const [searchText, setSearchText] = useState('');
const debouncedSearch = useMemo(
  () => debounce((text) => onSearch(text), 300),
  []
);

const handleSearchChange = (text) => {
  setSearchText(text);
  debouncedSearch(text);
};
```

---

## Testing Checklist

- [ ] Search works with special characters (-, ., @)
- [ ] Filter pills toggle correctly
- [ ] Clear button removes all filters
- [ ] Toast appears for 5 seconds then auto-dismisses
- [ ] Undo restores deleted item
- [ ] Multiple toasts stack without overlapping
- [ ] Responsive on mobile (toast, filters)
- [ ] Dark mode (if implementing)

---

## Future Enhancements

1. **Advanced Filters**: Date range, salary range, company size
2. **Saved Filters**: "Show me all rejected + no response this week"
3. **Export Formats**: CSV, Excel, PDF
4. **Smart Status Progression**: Auto-update to "Interviewing" when interview added
5. **Bulk Operations**: Move 10 candidates to "Interview" stage at once
