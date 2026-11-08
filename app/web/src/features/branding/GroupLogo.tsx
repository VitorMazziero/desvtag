import logo from "../../assets/desvtag-logo.png";

export function GroupLogo() {
  return (
    <img
      className="group-logo"
      src={logo}
      width={144}
      height={48}
      alt="DesvTAG"
      data-testid="group-logo-header"
    />
  );
}
