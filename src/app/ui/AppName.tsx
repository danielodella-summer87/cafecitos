import { AppMark } from "@/components/brand/AppMark";

export default function AppName({
  className = "",
}: {
  className?: string;
}) {
  return <AppMark className={className} />;
}
