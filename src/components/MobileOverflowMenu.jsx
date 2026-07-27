/**
 * Backdrop + dropdown-panel chrome for the mobile "..." overflow menu, copy-pasted
 * identically in JobTrackerApp and TasksApp. Each app supplies its own menu items
 * as children, since those differ per app.
 */
export default function MobileOverflowMenu({ isRTL, onClose, children }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-[200px] py-2`}>
        {children}
      </div>
    </>
  );
}
