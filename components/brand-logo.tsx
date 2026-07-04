import Image from "next/image";

export function BrandLogo({
  className = "size-9",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.png"
      alt="HelpexAI logo"
      width={512}
      height={512}
      priority={priority}
      className={className}
    />
  );
}
