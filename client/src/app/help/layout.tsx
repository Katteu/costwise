"use client"
import MainLayout from "@/components/layouts/MainLayout";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";
import ProtectedRoute from "@/components/routes/ProtectedRoute";

export default function UserManualLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <UserManualContent>
          {children}
        </UserManualContent>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

function UserManualContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebarContext();
  return (
    <div className="flex font-lato w-full">
      <MainLayout />
      <main className={`${isOpen ? 'w-[calc(100%-280px)] 2xl:w-full ml-[280px] 2xl:ml-[360px]' : 'w-full ml-[120px]'} min-h-screen font-lato bg-background transition-all duration-400 ease-in-out`}>
        {children}
      </main>
    </div>
  );
}
