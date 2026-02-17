export default function AppName({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden>☕</span>
      <span>
        <span className="text-red-600">C</span>
        afecito
        <span className="text-red-600">S</span>
      </span>
    </span>
  );
}
