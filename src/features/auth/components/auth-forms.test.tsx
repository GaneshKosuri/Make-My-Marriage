// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_ROUTES, SIGN_IN, SIGN_UP } from "../auth-content";
import { ForgotPasswordForm } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { ResetPasswordForm } from "./reset-password-form";
import { SignupForm } from "./signup-form";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

type Reply = { status: number; body: unknown };
const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

function reply({ status, body }: Reply) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}
const apiError = (status: number, code: string, message = "x", details?: object) => ({
  status,
  body: { error: { code, message, ...(details ? { details } : {}) } },
});

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, method: init.method, body: JSON.parse(String(init.body)) as unknown };
};

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  replace.mockReset();
});

describe("<LoginForm />", () => {
  it("validates on the client before calling the API", async () => {
    renderWithQuery(<LoginForm />);
    submit(SIGN_IN.submit);
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [true, AUTH_ROUTES.app],
    [false, AUTH_ROUTES.createWedding],
  ])("signs in and goes on (hasWedding=%s → %s)", async (hasWedding, destination) => {
    reply({ status: 200, body: { data: { user: {}, hasWedding } } });
    renderWithQuery(<LoginForm />);
    type("Email address", "akshay@example.com");
    type("Password", "secret password");
    submit(SIGN_IN.submit);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
    expect(lastRequest()).toEqual({
      url: "/api/auth/login",
      method: "POST",
      body: { email: "akshay@example.com", password: "secret password" },
    });
  });

  it("shows the generic banner for bad credentials", async () => {
    reply(apiError(401, "UNAUTHENTICATED", "Invalid email or password."));
    renderWithQuery(<LoginForm />);
    type("Email address", "akshay@example.com");
    type("Password", "wrong");
    submit(SIGN_IN.submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(SIGN_IN.invalidCredentials.title);
    expect(screen.getByLabelText("Password")).not.toHaveAttribute("aria-invalid");
    expect(replace).not.toHaveBeenCalled();
  });

  it("tells the user to wait when rate-limited", async () => {
    reply(apiError(429, "RATE_LIMITED"));
    renderWithQuery(<LoginForm />);
    type("Email address", "akshay@example.com");
    type("Password", "wrong");
    submit(SIGN_IN.submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(SIGN_IN.tooManyAttempts.title);
  });

  it("links to forgot password and sign up, and explains guest access", () => {
    renderWithQuery(<LoginForm />);
    expect(screen.getByRole("link", { name: SIGN_IN.forgotPassword })).toHaveAttribute(
      "href",
      AUTH_ROUTES.forgotPassword,
    );
    expect(screen.getByRole("link", { name: SIGN_IN.createAccount })).toHaveAttribute(
      "href",
      AUTH_ROUTES.signUp,
    );
    expect(screen.getByText(SIGN_IN.guestNote.title)).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    renderWithQuery(<LoginForm />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
  });
});

describe("<SignupForm />", () => {
  const fill = () => {
    type("Full name", "Akshay Saini");
    type("Email address", "akshay@example.com");
    type("Password", "correct horse");
  };

  it("creates the account and continues to create-wedding", async () => {
    reply({ status: 201, body: { data: { user: {}, hasWedding: false } } });
    renderWithQuery(<SignupForm />);
    fill();
    submit(SIGN_UP.submit);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(AUTH_ROUTES.createWedding));
    expect(lastRequest().body).toEqual({
      name: "Akshay Saini",
      email: "akshay@example.com",
      password: "correct horse",
    });
  });

  it("requires at least 8 characters", async () => {
    renderWithQuery(<SignupForm />);
    type("Full name", "A");
    type("Email address", "a@example.com");
    type("Password", "1234567");
    submit(SIGN_UP.submit);
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers sign-in when the email is taken", async () => {
    reply(apiError(409, "EMAIL_ALREADY_EXISTS"));
    renderWithQuery(<SignupForm />);
    fill();
    submit(SIGN_UP.submit);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(SIGN_UP.emailTaken.title);
    expect(screen.getByRole("link", { name: SIGN_UP.emailTaken.action })).toHaveAttribute(
      "href",
      AUTH_ROUTES.signIn,
    );
  });

  it("puts server validation messages on the fields", async () => {
    reply(apiError(400, "VALIDATION_ERROR", "Invalid", { email: "Email address is too long" }));
    renderWithQuery(<SignupForm />);
    fill();
    submit(SIGN_UP.submit);

    expect(await screen.findByText("Email address is too long")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("<ForgotPasswordForm />", () => {
  it("confirms without revealing whether the account exists, and can send again", async () => {
    reply({ status: 200, body: { success: true } });
    renderWithQuery(<ForgotPasswordForm />);
    type("Email address", "akshay@example.com");
    submit("Send reset link");

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/If an account exists for/)).toHaveTextContent(
      "If an account exists for akshay@example.com, we've sent a link",
    );
    expect(lastRequest()).toEqual({
      url: "/api/auth/forgot-password",
      method: "POST",
      body: { email: "akshay@example.com" },
    });

    reply({ status: 200, body: { success: true } });
    fireEvent.click(screen.getByRole("button", { name: "Didn't get it? Send again" }));
    expect(await screen.findByText("We've sent another link.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("<ResetPasswordForm />", () => {
  const token = "a".repeat(43);
  const fill = (password: string, confirm = password) => {
    type("New password", password);
    type("Confirm new password", confirm);
  };

  it("requires the confirmation to match", async () => {
    renderWithQuery(<ResetPasswordForm token={token} />);
    fill("correct horse", "correct house");
    submit("Save new password");
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the token with the new password and confirms", async () => {
    reply({ status: 200, body: { success: true } });
    renderWithQuery(<ResetPasswordForm token={token} />);
    fill("correct horse");
    submit("Save new password");

    expect(await screen.findByRole("heading", { name: "Password updated" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sign in/ })).toHaveAttribute(
      "href",
      AUTH_ROUTES.signIn,
    );
    expect(lastRequest().body).toEqual({ token, password: "correct horse" });
  });

  it.each([
    [410, "TOKEN_EXPIRED", "This link has expired"],
    [400, "INVALID_TOKEN", "This link can't be used"],
  ])("explains a %i %s link and offers a new one", async (status, code, heading) => {
    reply(apiError(status, code));
    renderWithQuery(<ResetPasswordForm token={token} />);
    fill("correct horse");
    submit("Save new password");

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Send a new link/ })).toHaveAttribute(
      "href",
      AUTH_ROUTES.forgotPassword,
    );
  });
});
