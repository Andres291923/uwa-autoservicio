import LogoutButton from "./logout-button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LogoutButton />
      {children}
    </>
  );
}