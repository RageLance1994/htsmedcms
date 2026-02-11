import { forwardRef } from "react";

const Table = forwardRef(function Table({ className = "", ...props }, ref) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      />
    </div>
  );
});

const TableHeader = forwardRef(function TableHeader(
  { className = "", ...props },
  ref
) {
  return <thead ref={ref} className={className} {...props} />;
});

const TableBody = forwardRef(function TableBody(
  { className = "", ...props },
  ref
) {
  return <tbody ref={ref} className={className} {...props} />;
});

const TableFooter = forwardRef(function TableFooter(
  { className = "", ...props },
  ref
) {
  return (
    <tfoot
      ref={ref}
      className={`border-t bg-[var(--surface-strong)] ${className}`}
      {...props}
    />
  );
});

const TableRow = forwardRef(function TableRow(
  { className = "", ...props },
  ref
) {
  return (
    <tr
      ref={ref}
      className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--hover)] ${className}`}
      {...props}
    />
  );
});

const TableHead = forwardRef(function TableHead(
  { className = "", ...props },
  ref
) {
  return (
    <th
      ref={ref}
      className={`h-10 px-3 text-left align-middle text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] ${className}`}
      {...props}
    />
  );
});

const TableCell = forwardRef(function TableCell(
  { className = "", ...props },
  ref
) {
  return (
    <td
      ref={ref}
      className={`px-3 py-2 align-middle text-sm ${className}`}
      {...props}
    />
  );
});

const TableCaption = forwardRef(function TableCaption(
  { className = "", ...props },
  ref
) {
  return (
    <caption
      ref={ref}
      className={`mt-4 text-sm text-[var(--muted)] ${className}`}
      {...props}
    />
  );
});

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
};
