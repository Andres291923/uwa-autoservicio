import TotemIdleRedirect from "./TotemIdleRedirect";

export default function TotemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TotemIdleRedirect />
      {children}
    </>
  );
}
