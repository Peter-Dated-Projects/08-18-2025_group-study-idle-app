# Notion Filter System Documentation

This system provides a comprehensive way to programmatically create and manage filters for your Notion databases.

## Quick Start

```typescript
import { NotionFilterBuilder, CommonFilters } from "@/lib/notion-filters";

// Simple filter for incomplete tasks
const filter = new NotionFilterBuilder().checkboxEquals("Completed", false).build();

// Or use a common filter pattern
const incompleteFilter = CommonFilters.incompleteTasks("Completed");
```

## API Endpoints

### Get Filter Options

**GET** `/api/notion/filters`

- Gets filter options for the currently selected database in your session
- Returns available properties and their filter capabilities

**GET** `/api/notion/databases/[id]/filters`

- Gets filter options for a specific database
- Returns comprehensive property analysis with filter examples

Response format:

```json
{
  "filterOptions": [
    {
      "property": "property_id",
      "type": "checkbox",
      "name": "Completed",
      "examples": [{ "checkbox": { "equals": true } }, { "checkbox": { "equals": false } }]
    }
  ],
  "commonFilters": {
    "completed_tasks": "...",
    "incomplete_tasks": "..."
  }
}
```

## Filter Builder

The `NotionFilterBuilder` class provides a fluent API for creating complex filters:

```typescript
const builder = new NotionFilterBuilder("and"); // or 'or'

const filter = builder
  .checkboxEquals("Completed", false)
  .selectEquals("Priority", "High")
  .datePastWeek("Due Date")
  .build();
```

### Available Methods

#### Text Filters

- `textEquals(property, value)` - Exact text match
- `textContains(property, value)` - Text contains substring
- `titleContains(property, value)` - Title contains substring

#### Checkbox Filters

- `checkboxEquals(property, boolean)` - Checkbox is checked/unchecked

#### Select Filters

- `selectEquals(property, value)` - Select equals specific option
- `selectDoesNotEqual(property, value)` - Select does not equal option
- `multiSelectContains(property, value)` - Multi-select contains option

#### Number Filters

- `numberEquals(property, number)`
- `numberGreaterThan(property, number)`
- `numberLessThan(property, number)`

#### Date Filters

- `dateEquals(property, date)`
- `dateAfter(property, date)`
- `dateBefore(property, date)`
- `datePastWeek(property)`
- `dateNextWeek(property)`
- `datePastMonth(property)`

#### People & Relation Filters

- `peopleContains(property, userId)` - Assigned to specific person
- `relationContains(property, pageId)` - Related to specific page

#### Empty/Not Empty Filters

- `isEmpty(property, propertyType)`
- `isNotEmpty(property, propertyType)`

## Common Filter Patterns

Pre-built filters for common use cases:

```typescript
import { CommonFilters } from "@/lib/notion-filters";

// Get all incomplete tasks
const incomplete = CommonFilters.incompleteTasks("Completed");

// Get high priority incomplete tasks
const urgent = CommonFilters.highPriorityIncomplete("Completed", "Priority");

// Get tasks due soon
const dueSoon = CommonFilters.tasksDueSoon("Due Date");

// Get overdue tasks
const overdue = CommonFilters.overdueTasks("Due Date");

// Get tasks assigned to me
const myTasks = CommonFilters.tasksAssignedToMe("Assignee", "user_id");

// Get recently created items
const recent = CommonFilters.recentlyCreated("Created Time");
```

## Combining Filters

Use `combineFilters()` to combine multiple filters with AND/OR logic:

```typescript
import { combineFilters } from "@/lib/notion-filters";

const filter1 = CommonFilters.incompleteTasks("Completed");
const filter2 = CommonFilters.tasksWithPriority("Priority", "High");

// All conditions must be true
const andFilter = combineFilters([filter1, filter2], "and");

// Any condition can be true
const orFilter = combineFilters([filter1, filter2], "or");
```

## React Hooks

### useNotionFilters

Main hook for managing filters in React components:

```typescript
import { useNotionFilters } from "@/hooks/useNotionFilters";

function TaskList() {
  const { filterOptions, currentFilter, setFilter, applyCommonFilter, loadFilterOptions } =
    useNotionFilters();

  // Apply a quick filter
  const showIncomplete = () => {
    const completedProp = filterOptions.find((opt) => opt.name.toLowerCase().includes("completed"));
    if (completedProp) {
      applyCommonFilter("incomplete", completedProp.property);
    }
  };

  return (
    <div>
      <button onClick={showIncomplete}>Show Incomplete Tasks</button>
      {/* Your task list here */}
    </div>
  );
}
```

### useFilterBuilder

Hook for building custom filters step by step:

```typescript
import { useFilterBuilder } from "@/hooks/useNotionFilters";

function CustomFilterBuilder() {
  const { builder, currentFilter, buildFilter, reset } = useFilterBuilder();

  const addCondition = () => {
    builder.checkboxEquals("Completed", false);
    buildFilter(); // Updates currentFilter
  };

  return (
    <div>
      <button onClick={addCondition}>Add Condition</button>
      <button onClick={reset}>Reset</button>
      {currentFilter && <pre>{JSON.stringify(currentFilter, null, 2)}</pre>}
    </div>
  );
}
```

## Real-World Examples

### 1. My Urgent Tasks Dashboard

```typescript
function getMyUrgentTasks(userId: string) {
  return new NotionFilterBuilder("and")
    .checkboxEquals("Completed", false)
    .selectEquals("Priority", "Urgent")
    .peopleContains("Assignee", userId)
    .build();
}
```

### 2. Weekly Review Filter

```typescript
function getWeeklyReviewTasks() {
  const completedThisWeek = new NotionFilterBuilder("and")
    .checkboxEquals("Completed", true)
    .datePastWeek("Completed Date")
    .build();

  const dueSoon = CommonFilters.tasksDueSoon("Due Date");

  return combineFilters([completedThisWeek, dueSoon], "or");
}
```

### 3. Project Status Filter

```typescript
function getProjectTasks(projectId: string, status?: string) {
  const builder = new NotionFilterBuilder("and").relationContains("Project", projectId);

  if (status) {
    builder.selectEquals("Status", status);
  }

  return builder.build();
}
```

## Error Handling

The system includes comprehensive error handling:

```typescript
const { error, isLoadingFilters } = useNotionFilters();

if (error) {
  console.error("Filter error:", error);
  // Handle error state
}

if (isLoadingFilters) {
  // Show loading state
}
```

## Best Practices

1. **Load filter options first**: Always call `loadFilterOptions()` before building filters to ensure you're using valid property names.

2. **Use common filters when possible**: The `CommonFilters` class provides tested, optimized filter patterns.

3. **Combine filters efficiently**: Use AND for restrictive filters, OR for inclusive filters.

4. **Handle loading states**: Filter options are loaded asynchronously, so account for loading states in your UI.

5. **Validate filter structure**: Use the `validateFilter()` helper to ensure your filters are properly formatted.

6. **Cache filter options**: Filter options rarely change, so consider caching them to improve performance.

## Filter Output Examples

### Simple Filter

```json
{
  "property": "Completed",
  "checkbox": { "equals": false }
}
```

### Complex Filter

```json
{
  "and": [
    {
      "property": "Completed",
      "checkbox": { "equals": false }
    },
    {
      "property": "Priority",
      "select": { "equals": "High" }
    },
    {
      "property": "Due Date",
      "date": { "next_week": {} }
    }
  ]
}
```

This filter structure can be passed directly to Notion's API or used in your task querying functions.
