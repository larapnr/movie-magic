import { Link } from "react-router-dom";
import { Message, btn } from "../components/ui";

export default function NotFound() {
  return (
    <Message title="Page not found" action={<Link to="/" className={btn.primary}>Go home</Link>}>
      The page you're looking for doesn't exist.
    </Message>
  );
}
