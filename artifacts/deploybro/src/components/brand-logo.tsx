import logoUrl from "@assets/deploybro.svg";

type Props = {
  className?: string;
  title?: string;
};

/**
 * The source SVG is a solid `#ffffff` glyph (designed for dark
 * backgrounds). Rather than ship a second asset, we collapse the
 * white to black with `filter: brightness(0)` in light mode and
 * restore it (`brightness(1)`) in dark mode. That keeps the logo
 * readable on both surfaces with one file.
 */
export function BrandLogo({ className = "h-5 w-auto", title }: Props) {
  return (
    <img
      src={logoUrl}
      alt={title ?? "DeployBro"}
      className={`${className} select-none brightness-0 dark:brightness-100`}
      draggable={false}
    />
  );
}
