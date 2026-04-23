import logoSrc from "@assets/cube-box-fill-svgrepo-com_1776904411419.png";

type Props = {
  className?: string;
  title?: string;
};

export function BoxLogo({ className = "w-5 h-5", title }: Props) {
  return (
    <img
      src={logoSrc}
      alt={title ?? "Instancly"}
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );
}
