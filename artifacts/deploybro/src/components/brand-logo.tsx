import logoUrl from "@assets/deploybro.svg";

type Props = {
  className?: string;
  title?: string;
};

export function BrandLogo({ className = "h-5 w-auto", title }: Props) {
  return (
    <img
      src={logoUrl}
      alt={title ?? "DeployBro"}
      className={`${className} select-none`}
      draggable={false}
    />
  );
}
