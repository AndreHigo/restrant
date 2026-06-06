import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function SvgBase({ children, className, ...props }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LayoutDashboardIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="3" y="3" width="7" height="8" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </SvgBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16.5 3.13a3.5 3.5 0 0 1 0 6.74" />
    </SvgBase>
  );
}

export function ClipboardListIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4.5h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v.5a1 1 0 0 0 1 1Z" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
      <path d="M8 18h5" />
    </SvgBase>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h12a1 1 0 0 1 1 1v2" />
      <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1h-4a2 2 0 1 1 0-4h4a1 1 0 0 0 1-1V6a2 2 0 0 0-2-2" />
      <circle cx="15" cy="12" r="1" />
    </SvgBase>
  );
}

export function BoxesIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </SvgBase>
  );
}

export function ShoppingCartIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h9.8a1 1 0 0 0 1-.8L21 7H7" />
    </SvgBase>
  );
}

export function ScrollTextIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M8 3h9a2 2 0 0 1 2 2v13" />
      <path d="M8 3a3 3 0 0 0 0 6h11" />
      <path d="M8 9v10a2 2 0 0 1-2 2H5a2 2 0 1 1 0-4h3" />
      <path d="M11 13h6" />
      <path d="M11 17h4" />
    </SvgBase>
  );
}

export function ChefHatIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M6 17h12" />
      <path d="M6 21h12" />
      <path d="M7 17v-3.5a1.2 1.2 0 0 0-.7-1.1A4 4 0 0 1 8.3 5 5 5 0 0 1 15.7 5a4 4 0 0 1 2 7.4c-.4.2-.7.6-.7 1.1V17" />
    </SvgBase>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M4 7h16l-1 11H5L4 7Z" />
      <path d="M12 7V4" />
      <path d="M8 10a4 4 0 0 1 8 0" />
      <path d="m12 12 2-2" />
    </SvgBase>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M12 22c4.2-1.5 8-4 8-9V5l-8-3-8 3v8c0 5 3.8 7.5 8 9Z" />
      <path d="m9 12 2 2 4-4" />
    </SvgBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
    </SvgBase>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m7.5 4.3 9 5.2" />
      <path d="M21 8.5 12 13 3 8.5 12 3l9 5.5Z" />
      <path d="M3 8.5V18l9 3 9-3V8.5" />
      <path d="M12 13v8" />
    </SvgBase>
  );
}

export function TagsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m3 12 8.6 8.6a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12 3H5a2 2 0 0 0-2 2v7Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </SvgBase>
  );
}

export function CarrotIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M13 3c1.5 0 2.5.8 3 2" />
      <path d="M9 4c-.3-1.2-1.3-2-3-2" />
      <path d="M14.7 8.3c2.6 2.6 2.8 6.8.3 9.3l-1 1c-2.5 2.5-6.7 2.3-9.3-.3l10-10Z" />
      <path d="M7 14 3 10" />
      <path d="M10 11 6 7" />
    </SvgBase>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M10 17H5a2 2 0 0 1-2-2V7h10v10Z" />
      <path d="M13 10h4l3 3v4h-7v-7Z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </SvgBase>
  );
}

export function UserRoundIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </SvgBase>
  );
}

export function UtensilsIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M4 3v8" />
      <path d="M7 3v8" />
      <path d="M4 7h3" />
      <path d="M5.5 11v10" />
      <path d="M14 3v7a3 3 0 0 0 3 3h0v8" />
      <path d="M17 3v18" />
    </SvgBase>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </SvgBase>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M10 2v6l-5.5 9.5A2 2 0 0 0 6.2 20h11.6a2 2 0 0 0 1.7-2.5L14 8V2" />
      <path d="M8.5 2h7" />
      <path d="M7 14h10" />
    </SvgBase>
  );
}
