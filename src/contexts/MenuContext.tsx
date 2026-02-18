import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiCall } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface Menu {
  id: string;
  name: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface MenuContextType {
  menus: Menu[];
  selectedMenu: Menu | null;
  setSelectedMenu: (menu: Menu) => void;
  refreshMenus: () => Promise<void>;
  loading: boolean;
}

const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMenus = useCallback(async () => {
    try {
      const data = await apiCall<{ menus: Menu[] }>("get_menus");
      setMenus(data.menus || []);
      if (data.menus?.length > 0 && !selectedMenu) {
        setSelectedMenu(data.menus[0]);
      }
    } catch {
      // Ignore errors
    }
    setLoading(false);
  }, [selectedMenu]);

  useEffect(() => {
    if (user && user.role === "menu_dev") {
      refreshMenus();
    } else {
      setLoading(false);
    }
  }, [user, refreshMenus]);

  return (
    <MenuContext.Provider value={{ menus, selectedMenu, setSelectedMenu, refreshMenus, loading }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
}
