import logoImage from "@assets/SplitSheet Pro logo _1758885028389.png";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <img 
      src={logoImage} 
      alt="Splitfy Logo" 
      className={`w-8 h-8 ${className}`} 
      data-testid="logo"
    />
  );
}
