import Image from "next/image";

type AppLogoProps = {
  compact?: boolean;
};

export default function AppLogo({ compact = false }: AppLogoProps) {
  if (compact) {
    return (
      <Image
        src="/icons/m-pharma.svg"
        alt="M Pharma"
        width={52}
        height={52}
        priority
        className="h-12 w-12 object-contain"
      />
    );
  }

  return (
    <Image
      src="/branding/mpangi-pharma-logo.svg"
      alt="Mpangi Pharma"
      width={360}
      height={96}
      priority
      className="h-16 w-auto object-contain md:h-[72px]"
    />
  );
}
