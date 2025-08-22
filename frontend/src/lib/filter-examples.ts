// Example usage of the Notion Filter System

import {
  NotionFilterBuilder,
  CommonFilters,
  combineFilters,
  DatabaseFilter,
} from "@/lib/notion-filters";

// Example 1: Building a simple filter
export function exampleSimpleFilter() {
  const filter = new NotionFilterBuilder().checkboxEquals("Completed", false).build();

  console.log("Simple filter:", JSON.stringify(filter, null, 2));
  return filter;
}

// Example 2: Building a complex filter with multiple conditions
export function exampleComplexFilter() {
  const filter = new NotionFilterBuilder("and")
    .checkboxEquals("Completed", false)
    .selectEquals("Priority", "High")
    .datePastWeek("Due Date")
    .build();

  console.log("Complex filter:", JSON.stringify(filter, null, 2));
  return filter;
}

// Example 3: Using common filter patterns
export function exampleCommonFilters() {
  // Get all incomplete tasks
  const incompleteFilter = CommonFilters.incompleteTasks("Completed");

  // Get high priority incomplete tasks
  const highPriorityFilter = CommonFilters.highPriorityIncomplete("Completed", "Priority");

  // Get tasks due soon
  const dueSoonFilter = CommonFilters.tasksDueSoon("Due Date");

  return {
    incomplete: incompleteFilter,
    highPriority: highPriorityFilter,
    dueSoon: dueSoonFilter,
  };
}

// Example 4: Combining multiple filters
export function exampleCombineFilters() {
  const filter1 = CommonFilters.incompleteTasks("Completed");
  const filter2 = CommonFilters.tasksWithPriority("Priority", "High");
  const filter3 = CommonFilters.tasksDueSoon("Due Date");

  // Combine with AND logic (all conditions must be true)
  const andFilter = combineFilters([filter1, filter2, filter3], "and");

  // Combine with OR logic (any condition can be true)
  const orFilter = combineFilters([filter1, filter2, filter3], "or");

  return {
    and: andFilter,
    or: orFilter,
  };
}

// Example 5: Building filters dynamically based on user input
export function buildDynamicFilter(
  completedStatus: boolean,
  priority?: string,
  assignee?: string,
  searchText?: string
) {
  const builder = new NotionFilterBuilder("and");

  // Always filter by completion status
  builder.checkboxEquals("Completed", completedStatus);

  // Add optional filters based on provided parameters
  if (priority) {
    builder.selectEquals("Priority", priority);
  }

  if (assignee) {
    builder.peopleContains("Assignee", assignee);
  }

  if (searchText) {
    builder.titleContains("Name", searchText);
  }

  return builder.build();
}

// Example 6: Using the filters with the API
export async function exampleUsingFiltersWithAPI() {
  try {
    // Get available filter options for the current database
    const filtersResponse = await fetch("/api/notion/filters");
    const { filterOptions } = await filtersResponse.json();

    console.log("Available filter options:", filterOptions);

    // Build a filter based on available properties
    const completedProperty = filterOptions.find(
      (opt: any) =>
        opt.name.toLowerCase().includes("completed") || opt.name.toLowerCase().includes("done")
    );

    if (completedProperty) {
      const filter = new NotionFilterBuilder()
        .checkboxEquals(completedProperty.property, false)
        .build();

      // Use this filter when querying tasks
      console.log("Filter to use:", filter);

      // In a real implementation, you'd pass this filter to your task querying function
      // const tasks = await queryTasksWithFilter(filter);
    }
  } catch (error) {
    console.error("Error using filters with API:", error);
  }
}

// Example 7: Real-world filter scenarios
export const filterScenarios = {
  // Show only my urgent tasks that are overdue
  myUrgentOverdueTasks: (userId: string) => {
    return new NotionFilterBuilder("and")
      .checkboxEquals("Completed", false)
      .selectEquals("Priority", "Urgent")
      .peopleContains("Assignee", userId)
      .dateBefore("Due Date", new Date().toISOString().split("T")[0])
      .build();
  },

  // Show tasks created this week that are not yet started
  newTasksThisWeek: () => {
    return new NotionFilterBuilder("and")
      .datePastWeek("Created Time")
      .selectEquals("Status", "Not Started")
      .build();
  },

  // Show completed tasks from the last month for reporting
  completedLastMonth: () => {
    return new NotionFilterBuilder("and")
      .checkboxEquals("Completed", true)
      .datePastMonth("Completed Date")
      .build();
  },

  // Show tasks that contain specific keywords in their title
  tasksByKeywords: (keywords: string[]) => {
    const filters = keywords
      .map((keyword) => new NotionFilterBuilder().titleContains("Name", keyword).build())
      .filter((f) => f !== null) as DatabaseFilter[];

    return combineFilters(filters, "or");
  },
};

// Helper function to create a user-friendly filter description
export function describeFilter(filter: any): string {
  if (!filter) return "No filter applied";

  const descriptions: string[] = [];

  function parseFilter(f: any, level = 0): void {
    if (f.and) {
      descriptions.push(`${level > 0 ? "AND (" : ""}ALL of:`);
      f.and.forEach((subFilter: any) => parseFilter(subFilter, level + 1));
      if (level > 0) descriptions.push(")");
    } else if (f.or) {
      descriptions.push(`${level > 0 ? "OR (" : ""}ANY of:`);
      f.or.forEach((subFilter: any) => parseFilter(subFilter, level + 1));
      if (level > 0) descriptions.push(")");
    } else if (f.property) {
      // Parse individual property filters
      const property = f.property;
      const filterType = Object.keys(f).find((key) => key !== "property");
      if (filterType) {
        const filterValue = f[filterType];

        if (filterType && typeof filterValue === "object") {
          const condition = Object.keys(filterValue)[0];
          const value = filterValue[condition];
          descriptions.push(`  ${property} ${condition} "${value}"`);
        }
      }
    }
  }

  parseFilter(filter);
  return descriptions.join("\n");
}

// Example usage:
/*
const filter = exampleComplexFilter();
console.log('Filter description:', describeFilter(filter));

Output:
Filter description: 
ALL of:
  Completed equals "false"
  Priority equals "High"
  Due Date past_week ""
*/
