import { fetchWithTokenRefresh } from "./notion-token-refresh";

interface DataSource {
  id: string;
  name: string;
}

interface DatabaseResponse {
  object: "database";
  id: string;
  data_sources: DataSource[];
  // ... other database properties
}

/**
 * Get data source IDs for a database using the new 2025-09-03 API
 * @param userId - The user ID
 * @param databaseId - The database ID
 * @returns Promise<string[]> - Array of data source IDs
 */
export async function getDataSourceIds(userId: string, databaseId: string): Promise<string[]> {
  try {

    const response = await fetchWithTokenRefresh(
      userId,
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Failed to get database info:", errorData);
      throw new Error(`Failed to get database info: ${response.status}`);
    }

    const databaseData: DatabaseResponse = await response.json();
    const dataSourceIds = databaseData.data_sources.map((ds) => ds.id);

    return dataSourceIds;
  } catch (error) {
    console.error("❌ Error getting data source IDs:", error);
    throw error;
  }
}

/**
 * Get the primary (first) data source ID for a database
 * @param userId - The user ID
 * @param databaseId - The database ID
 * @returns Promise<string> - The primary data source ID
 */
export async function getPrimaryDataSourceId(userId: string, databaseId: string): Promise<string> {
  const dataSourceIds = await getDataSourceIds(userId, databaseId);

  if (dataSourceIds.length === 0) {
    throw new Error(`No data sources found for database ${databaseId}`);
  }

  // Return the first data source (primary one)
  return dataSourceIds[0];
}

/**
 * Query a data source using the new 2025-09-03 API
 * @param userId - The user ID
 * @param dataSourceId - The data source ID
 * @param queryOptions - Query options (filter, sorts, etc.)
 * @returns Promise<Response> - The fetch response
 */
export async function queryDataSource(
  userId: string,
  dataSourceId: string,
  queryOptions: Record<string, unknown> = {}
): Promise<Response> {

  return fetchWithTokenRefresh(
    userId,
    `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryOptions),
    }
  );
}
