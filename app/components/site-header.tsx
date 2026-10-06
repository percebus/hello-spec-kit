import Link from "next/link";

const primaryNavigation = [
  { href: "/", label: "Home" },
  { href: "/episodes", label: "Episodes" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        Signal & Story
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        <ul>
          {primaryNavigation.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
