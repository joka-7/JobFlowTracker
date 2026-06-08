# UX Enhancements - Priority 2 & 3

## Priority 2 (Medium Priority) Enhancements

### 1. Smart Status Progression

**File**: `src/utils/smartStatusProgression.js`

Automatically suggest or update status based on user actions.

**Example**: 
- User adds first interview → Suggest "Interviewing" status
- User adds rejection date → Auto-update to "Rejected"
- User adds offer date → Suggest "Offer"

**Usage in Components**:
```jsx
import { suggestNextStatus, getProgressionPath } from './utils/smartStatusProgression';

function CompanyDetail({ company }) {
  const suggestedStatus = suggestNextStatus(company.status, {
    interviewAdded: company.interviews?.length > 0,
    rejectionDate: !!company.rejection?.date,
  });

  if (suggestedStatus && suggestedStatus !== company.status) {
    return (
      <InfoBox>
        💡 You added an interview. Auto-update to "{suggestedStatus}"?
        <Button onClick={() => updateStatus(suggestedStatus)}>
          Yes, update
        </Button>
      </InfoBox>
    );
  }
}
```

**Benefits**:
- ✅ Less manual status updates
- ✅ Cleaner UI (fewer clicks)
- ✅ Consistent pipeline progression
- ✅ Shows next possible statuses

### 2. Bulk Operations

**File**: `src/components/BulkActionsBar.jsx`

Perform actions on multiple items at once.

**Supports**:
- Bulk status changes (move 10 candidates to "Interview")
- Bulk tagging/labeling
- Bulk export to CSV
- Bulk delete with confirmation

**Integration**:
```jsx
import BulkActionsBar from './components/BulkActionsBar';

function CompanyList() {
  const [selected, setSelected] = useState([]);

  const handleBulkStatusUpdate = (newStatus) => {
    Promise.all(
      selected.map(id => updateCompany(id, { status: newStatus }))
    ).then(() => setSelected([]));
  };

  return (
    <>
      <BulkActionsBar
        selectedCount={selected.length}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkDelete={handleBulkDelete}
        statusOptions={statuses}
      />
      
      {companies.map(c => (
        <Checkbox
          key={c.id}
          checked={selected.includes(c.id)}
          onChange={(checked) => {
            if (checked) setSelected([...selected, c.id]);
            else setSelected(selected.filter(id => id !== c.id));
          }}
        />
      ))}
    </>
  );
}
```

**Recruiting Example**:
```
SELECT candidates → CLICK "Change Status" → SELECT "Interview Stage"
Result: All 10 candidates moved at once (vs 10 manual updates)
```

---

## Priority 3 (Nice-to-Have) Enhancements

### 3. Enhanced Calendar Improvements

**Location**: Modify `src/components/CalendarView.jsx`

**Add**:
- Legend with event type colors
- Event count badges on days
- Event preview on day cell hover
- Mobile: Full-day view instead of grid

**Code Pattern**:
```jsx
// Add legend
<CalendarLegend>
  <LegendItem color="blue" label="Interview" />
  <LegendItem color="red" label="Deadline" />
  <LegendItem color="green" label="Task Due" />
</CalendarLegend>

// Add count badge
<DayCell date={date}>
  <div className="text-xs text-gray-500">{eventCount} events</div>
</DayCell>

// Add hover preview
<Tooltip>
  <ul className="text-sm">
    {events.map(e => <li key={e.id}>{e.title}</li>)}
  </ul>
</Tooltip>
```

### 4. Better Mode Indicators

**Location**: Modify header in `src/JobTrackerApp.jsx`

**Add**:
- Current mode badge (prominent)
- Visual distinction when switching
- "You are in Job Seeker mode" hint
- Breadcrumb: Home > Mode > Current View

**Example Badge**:
```jsx
<div className="flex items-center gap-2">
  <Briefcase size={16} />
  <span className="text-sm font-bold text-purple-600">Job Seeker Mode</span>
  <button className="text-xs px-2 py-1 bg-purple-100 rounded hover:bg-purple-200">
    Switch Mode →
  </button>
</div>
```

**Benefits**:
- ✅ Clear context (no confusion about which mode you're in)
- ✅ Reduces "where am I?" moments
- ✅ Easier mode switching

### 5. Template Library Visibility

**Location**: Modify `src/components/AIAssistant.jsx`

**Current**: Template library nested in menu  
**Improved**: Direct access from interview prep flow

**Changes**:
```jsx
// In Interview Prep panel:
<InterviewPrepPanel>
  <div className="space-y-4">
    <InterviewPrepTips company={company} />
    
    <Divider />
    
    {/* NEW: Template library quick access */}
    <Button variant="secondary" onClick={openTemplateLibrary}>
      📚 Browse 80+ Interview Questions
    </Button>
    
    <Divider />
    
    <Button onClick={startMockInterview}>
      💬 Practice Interview with AI
    </Button>
  </div>
</InterviewPrepPanel>
```

**Benefits**:
- ✅ Discover built-in templates
- ✅ Less time reinventing questions
- ✅ Higher feature usage

### 6. Better Export/Import Feedback

**Location**: Modify export/import handlers

**Current**: Download icon (unclear what it does)  
**Improved**: Clear labels + file size + success message

```jsx
// Export button
<Button 
  icon={<Download />}
  title="📥 Backup Data"
  onClick={() => {
    exportData();
    // Show: "✓ Downloaded: companies.json (45 KB)"
    showToast('✓ Backup downloaded: companies.json (45 KB)', 'success');
  }}
>
  Backup Data
</Button>

// Import button
<label>
  <Button icon={<Upload />}>📤 Restore Backup</Button>
  <input 
    type="file" 
    onChange={(e) => {
      const file = e.target.files[0];
      importData(file);
      showToast(`✓ Restored ${file.name} (${file.size} bytes)`, 'success');
    }} 
  />
</label>
```

---

## Implementation Priority

| Enhancement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Smart Status | 2h | 🟢 High | P2-1 |
| Bulk Operations | 3h | 🟢 High | P2-2 |
| Calendar Legend | 1h | 🟡 Medium | P3-1 |
| Mode Indicators | 1.5h | 🟡 Medium | P3-2 |
| Templates Visibility | 1h | 🟡 Medium | P3-3 |
| Export/Import UX | 0.5h | 🟡 Medium | P3-4 |

**Total**: ~9 hours (can be done incrementally)

---

## Testing Checklist

- [ ] Smart status suggestion shows at right time
- [ ] Bulk delete confirms before deleting
- [ ] Bulk status update applies to all selected
- [ ] Calendar shows event count badges
- [ ] Hover preview shows on calendar day
- [ ] Mode badge updates when switching
- [ ] Export shows file size in success message
- [ ] Import validates file before importing
- [ ] Template library link works from AI panel
- [ ] Mobile: Calendar shows full-day view

---

## Related Components

- `SearchFilter.jsx` - Works with bulk selection
- `Toast.jsx` - Shows operation feedback
- `BulkActionsBar.jsx` - NEW bulk operations UI
- `smartStatusProgression.js` - NEW status utilities

---

## Future Ideas (P4)

- Recurring tasks
- Template customization
- Advanced filtering (date range, salary)
- Saved filter presets
- Dark mode
- Keyboard shortcuts
- Mobile app
