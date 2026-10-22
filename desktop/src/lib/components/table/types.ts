/** Column contract for the shared table.
 *
 * The table renders order, not data: it shows the header and owns the sort
 * affordance, while the page decides how rows are ordered. That keeps SQL
 * ordering, client-side sorting and future server sorting out of the view.
 */
export type TableColumn = {
  label: string;
  /** Numeric columns sit on the right edge so digits line up down the table. */
  align?: "start" | "end";
  /** Supplying a key makes the header sortable; the caller owns the ordering. */
  sortKey?: string;
};

export type TableSort = {
  key: string;
  direction: "asc" | "desc";
};
