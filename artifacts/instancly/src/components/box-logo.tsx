type Props = {
  className?: string;
  title?: string;
};

export function BoxLogo({ className = "w-5 h-5", title }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d="M12 2.2 3 6.55v.04l4.55 2.2L16.6 4.4 12 2.2Z" />
      <path d="M21 6.59 11.95 10.95 17.04 13.41 21 11.5V6.59Z" />
      <path d="M3 8.07v9.78l8.45 4.08V12.15L3 8.07Z" />
      <path d="M21 12.5l-3.96 1.91v3.39l-1.5-.72v-2.67L12.45 16V21.93L21 17.85V12.5Z" />
    </svg>
  );
}
