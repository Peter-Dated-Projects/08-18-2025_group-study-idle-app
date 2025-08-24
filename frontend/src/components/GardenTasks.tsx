import { useState, useEffect } from "react";
import { HeaderFont } from "@/components/constants";
import { useNotionFilters } from "@/hooks/useNotionFilters";
import { useGlobalNotification } from "@/components/NotificationProvider";
import GardenTaskListContainer from "./GardenTaskListContainer";

export const AUTH_TOKEN_KEY = "auth_token";

// Helper function to extract plain text from Notion rich text objects
const extractPlainText = (richTextArray: any): string => {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return "";
  }
  return richTextArray.map((textObj: any) => textObj.plain_text || "").join("");
};

interface Task {
  id: string;
  title: string;
  completed?: boolean;
  status?: string;
  dueDate?: string;
  priority?: string;
  assignee?: any;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
}

interface DatabasePage {
  id: string;
  title: string;
  properties?: Record<string, any>;
  notionUrl?: string;
  createdTime?: string;
  lastEditedTime?: string;
  archived?: boolean;
  icon?: any;
  cover?: any;
}

interface SelectedDatabase {
  id: string;
  title: string;
  selectedAt: string;
}

export default function GardenTasks() {
  const [isLoading, setIsLoading] = useState(true);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<SelectedDatabase | null>(null);

  const { addError } = useGlobalNotification();

  // Filter system integration
  const {
    filterOptions,
    currentFilter,
    setFilter,
    applyCommonFilter,
    loadFilterOptions,
    isLoadingFilters,
    error: filterError,
  } = useNotionFilters();

  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Auth states - simplified
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Add filter errors to global error system
  useEffect(() => {
    if (filterError) {
      addError(`Filter Error: ${filterError}`);
    }
  }, [filterError, addError]);

  // Check if user is authenticated (both Google and Notion)
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Load default database on startup after authentication
  useEffect(() => {
    if (isAuthenticated && !selectedDatabase) {
      loadDefaultDatabase();
    }
  }, [isAuthenticated, selectedDatabase]);

  // Listen for database change events from other components
  useEffect(() => {
    const handleDatabaseChange = (event: CustomEvent) => {
      console.log("Database changed:", event.detail);
      setSelectedDatabase({
        id: event.detail.databaseId,
        title: event.detail.databaseTitle,
        selectedAt: new Date().toISOString(),
      });
    };

    window.addEventListener("databaseChanged", handleDatabaseChange as EventListener);

    return () => {
      window.removeEventListener("databaseChanged", handleDatabaseChange as EventListener);
    };
  }, []);

  // Load filter options when database changes
  useEffect(() => {
    if (selectedDatabase) {
      loadFilterOptions(selectedDatabase.id);
    }
  }, [selectedDatabase, loadFilterOptions]);

  const loadDefaultDatabase = async () => {
    try {
      // Use the enabled databases endpoint for GardenTasks (only Firestore-enabled databases)
      const response = await fetch("/api/notion/databases/enabled", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to load enabled databases for default selection");
        addError("Failed to load available databases. Please try refreshing.");
        return;
      }

      const data = await response.json();
      const databases = data.databases || [];

      if (databases.length > 0) {
        // Select the first database as default
        const defaultDb = databases[0];
        const selectedDb = {
          id: defaultDb.id,
          title: defaultDb.title?.[0]?.plain_text || defaultDb.title || "Untitled Database",
          selectedAt: new Date().toISOString(),
        };

        setSelectedDatabase(selectedDb);
        console.log("Default enabled database selected:", selectedDb.title);
      } else {
        // No enabled databases available - user needs to duplicate template
        addError(
          data.message ||
            "No databases found. Please duplicate a template from your Notion integration to get started."
        );
        console.log("No enabled databases available for user");
      }
    } catch (error) {
      console.error("Error loading default database:", error);
      addError("Error loading databases. Please try refreshing the page.");
    }
  };

  const checkAuthentication = async () => {
    try {
      // Check Google auth
      const googleResponse = await fetch("/api/auth/session", {
        credentials: "include",
      });

      if (!googleResponse.ok) {
        redirectToLogin();
        return;
      }

      const googleData = await googleResponse.json();
      if (!googleData.success || !googleData.userEmail) {
        redirectToLogin();
        return;
      }

      // Check Notion auth
      const notionResponse = await fetch("/api/notion/session", {
        credentials: "include",
      });

      if (!notionResponse.ok) {
        redirectToLogin();
        return;
      }

      const notionData = await notionResponse.json();
      if (!notionData.success || !notionData.hasValidTokens) {
        redirectToLogin();
        return;
      }

      // Both are authenticated
      setUserEmail(googleData.userEmail);
      setUserName(googleData.userName || null);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Authentication check failed:", error);
      redirectToLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToLogin = () => {
    window.location.href = "/login";
  };

  const handleDataLoaded = (data: { taskList: Task[] }) => {
    setTaskList(data.taskList);
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          fontFamily: HeaderFont,
          fontSize: "2rem",
          color: "#333",
          letterSpacing: "1px",
        }}
      >
        Loading...
      </div>
    );
  }

  // If not authenticated, this shouldn't show (should redirect), but just in case
  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="p-1 h-full flex flex-col">
      <div className="flex items-center select-none mb-2">
        <img src="/icon.png" alt="Icon" className="w-10 h-10 mr-3 select-none" />
        <h1 className="font-header text-3xl m-0 select-none" style={{ fontFamily: HeaderFont }}>
          Task List
        </h1>
      </div>

      <div className="flex flex-col items-center w-full flex-1 min-h-0">
        <p className="mb-2 text-center w-full">Welcome, {userName || userEmail}!</p>

        {selectedDatabase && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold text-gray-800">{selectedDatabase.title}</h3>
            <p className="text-sm text-gray-500">
              {"Database • "}
              {taskList.length} items
            </p>
          </div>
        )}

        {/* Table Content with horizontal and vertical scrolling */}
        <div className="flex-1 min-h-0 w-full max-w-6xl">
          <GardenTaskListContainer
            selectedDatabase={selectedDatabase}
            currentFilter={currentFilter}
            onFilterClear={() => setFilter(null)}
            onTaskClick={(task: Task) => {
              // Optional: Handle task click if needed
              console.log("Task clicked:", task);
            }}
            isAuthenticated={isAuthenticated}
            onRedirectToLogin={redirectToLogin}
            onDataLoaded={handleDataLoaded}
            filterOptions={filterOptions}
            onFilterChange={setFilter}
          />
        </div>
      </div>
    </div>
  );
}
