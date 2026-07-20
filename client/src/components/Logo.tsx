import logoImage from "@assets/SplitSheet Pro logo _1758885028389.png";

/**
 * Brand mark. The source artwork is a non-square (167×214) raster with its
 * cream backing baked in — sizing it with a fixed width AND height (as the
 * previous `w-8 h-8` did) stretches it out of proportion. `h-*` + `w-auto` +
 * `object-contain` keeps it exactly as designed, just scaled.
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src={logoImage}
      alt="SplitSheet"
      className={`h-9 w-auto object-contain rounded-[10px] shadow-sm ring-1 ring-black/5 select-none ${className}`}
      draggable={false}
      data-testid="logo"
    />
  );
}
