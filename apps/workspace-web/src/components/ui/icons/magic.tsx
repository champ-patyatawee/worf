interface MagicProps {
  className?: string;
}

const Magic = ({ className }: MagicProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M9.663 17.042l1.884-1.884a2.5 2.5 0 113.536 3.536l-1.884 1.884M9.663 17.042l4.934 4.934M9.663 17.042l1.884 1.884M14.5 3.5L21 10M21 10L18.5 10M21 10L21 7.5M3 21L10 14.5M3 21L5.5 21M3 21L3 18.5M12.5 3L10 5.5M12.5 3L15 3M12.5 3L12.5 5.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Magic;
