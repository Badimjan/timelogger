// Shows a work item title that may be Persian. The block stays left-to-right so it lines up with the
// text around it, and <bdi> still shapes the Persian text correctly inside it.
export function Title({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div dir="ltr" className={`truncate text-left ${className}`}>
      <bdi>{children}</bdi>
    </div>
  );
}
