// Utility functions for building Notion database filters programmatically

export interface NotionFilter {
  property?: string;
  [filterType: string]: any;
}

export interface CompoundFilter {
  and?: NotionFilter[];
  or?: NotionFilter[];
}

export type DatabaseFilter = NotionFilter | CompoundFilter;

export class NotionFilterBuilder {
  private filters: NotionFilter[] = [];
  private operator: "and" | "or" = "and";

  constructor(operator: "and" | "or" = "and") {
    this.operator = operator;
  }

  // Text-based filters
  textEquals(property: string, value: string): this {
    this.filters.push({
      property,
      rich_text: { equals: value },
    });
    return this;
  }

  textContains(property: string, value: string): this {
    this.filters.push({
      property,
      rich_text: { contains: value },
    });
    return this;
  }

  titleContains(property: string, value: string): this {
    this.filters.push({
      property,
      title: { contains: value },
    });
    return this;
  }

  // Checkbox filters
  checkboxEquals(property: string, value: boolean): this {
    this.filters.push({
      property,
      checkbox: { equals: value },
    });
    return this;
  }

  // Select filters
  selectEquals(property: string, value: string): this {
    this.filters.push({
      property,
      select: { equals: value },
    });
    return this;
  }

  selectDoesNotEqual(property: string, value: string): this {
    this.filters.push({
      property,
      select: { does_not_equal: value },
    });
    return this;
  }

  // Multi-select filters
  multiSelectContains(property: string, value: string): this {
    this.filters.push({
      property,
      multi_select: { contains: value },
    });
    return this;
  }

  // Number filters
  numberEquals(property: string, value: number): this {
    this.filters.push({
      property,
      number: { equals: value },
    });
    return this;
  }

  numberGreaterThan(property: string, value: number): this {
    this.filters.push({
      property,
      number: { greater_than: value },
    });
    return this;
  }

  numberLessThan(property: string, value: number): this {
    this.filters.push({
      property,
      number: { less_than: value },
    });
    return this;
  }

  // Date filters
  dateEquals(property: string, date: string): this {
    this.filters.push({
      property,
      date: { equals: date },
    });
    return this;
  }

  dateAfter(property: string, date: string): this {
    this.filters.push({
      property,
      date: { after: date },
    });
    return this;
  }

  dateBefore(property: string, date: string): this {
    this.filters.push({
      property,
      date: { before: date },
    });
    return this;
  }

  datePastWeek(property: string): this {
    this.filters.push({
      property,
      date: { past_week: {} },
    });
    return this;
  }

  dateNextWeek(property: string): this {
    this.filters.push({
      property,
      date: { next_week: {} },
    });
    return this;
  }

  datePastMonth(property: string): this {
    this.filters.push({
      property,
      date: { past_month: {} },
    });
    return this;
  }

  // People filters
  peopleContains(property: string, personId: string): this {
    this.filters.push({
      property,
      people: { contains: personId },
    });
    return this;
  }

  // Relation filters
  relationContains(property: string, pageId: string): this {
    this.filters.push({
      property,
      relation: { contains: pageId },
    });
    return this;
  }

  // Empty/Not empty filters
  isEmpty(property: string, propertyType: string): this {
    this.filters.push({
      property,
      [propertyType]: { is_empty: true },
    });
    return this;
  }

  isNotEmpty(property: string, propertyType: string): this {
    this.filters.push({
      property,
      [propertyType]: { is_not_empty: true },
    });
    return this;
  }

  // Build the final filter object
  build(): DatabaseFilter | null {
    if (this.filters.length === 0) {
      return null;
    }

    if (this.filters.length === 1) {
      return this.filters[0];
    }

    return {
      [this.operator]: this.filters,
    };
  }

  // Reset builder
  reset(): this {
    this.filters = [];
    return this;
  }

  // Get current filters array
  getFilters(): NotionFilter[] {
    return [...this.filters];
  }
}

// Pre-built common filter patterns
export class CommonFilters {
  static completedTasks(completedProperty: string): DatabaseFilter {
    return new NotionFilterBuilder().checkboxEquals(completedProperty, true).build()!;
  }

  static incompleteTasks(completedProperty: string): DatabaseFilter {
    return new NotionFilterBuilder().checkboxEquals(completedProperty, false).build()!;
  }

  static tasksWithStatus(statusProperty: string, status: string): DatabaseFilter {
    return new NotionFilterBuilder().selectEquals(statusProperty, status).build()!;
  }

  static tasksDueSoon(dueDateProperty: string): DatabaseFilter {
    return new NotionFilterBuilder().dateNextWeek(dueDateProperty).build()!;
  }

  static overdueTasks(dueDateProperty: string): DatabaseFilter {
    return new NotionFilterBuilder()
      .dateBefore(dueDateProperty, new Date().toISOString().split("T")[0])
      .build()!;
  }

  static tasksWithPriority(priorityProperty: string, priority: string): DatabaseFilter {
    return new NotionFilterBuilder().selectEquals(priorityProperty, priority).build()!;
  }

  static tasksAssignedToMe(assigneeProperty: string, myUserId: string): DatabaseFilter {
    return new NotionFilterBuilder().peopleContains(assigneeProperty, myUserId).build()!;
  }

  static tasksContainingText(titleProperty: string, searchText: string): DatabaseFilter {
    return new NotionFilterBuilder().titleContains(titleProperty, searchText).build()!;
  }

  static recentlyCreated(createdTimeProperty: string = "created_time"): DatabaseFilter {
    return new NotionFilterBuilder().datePastWeek(createdTimeProperty).build()!;
  }

  static highPriorityIncomplete(
    completedProperty: string,
    priorityProperty: string
  ): DatabaseFilter {
    return new NotionFilterBuilder("and")
      .checkboxEquals(completedProperty, false)
      .selectEquals(priorityProperty, "High")
      .build()!;
  }
}

// Helper function to combine multiple filters
export function combineFilters(
  filters: DatabaseFilter[],
  operator: "and" | "or" = "and"
): DatabaseFilter {
  if (filters.length === 0) {
    throw new Error("Cannot combine empty filters array");
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return {
    [operator]: filters,
  };
}

// Helper function to validate filter structure
export function validateFilter(filter: DatabaseFilter): boolean {
  try {
    // Basic validation - in a real implementation you'd want more thorough validation
    if (!filter || typeof filter !== "object") {
      return false;
    }

    // Check if it's a compound filter
    if ("and" in filter || "or" in filter) {
      const key = "and" in filter ? "and" : "or";
      return Array.isArray(filter[key]) && filter[key].length > 0;
    }

    // Check if it's a property filter
    return "property" in filter && typeof filter.property === "string";
  } catch (error) {
    return false;
  }
}
