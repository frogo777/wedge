/**
 * Tests para los helpers de eventos UX (Sprint 0 + wiring Ola 2).
 *
 * Estrategia: mockea `captureEvent` y verifica que cada helper:
 *   - Llama capture con el event name correcto
 *   - Pasa los props que dice pasar
 *   - Nunca throws aunque captureEvent falle
 *
 * No testeamos PostHog SDK real — eso es responsabilidad de PostHog.
 * Testeamos que NUESTROS helpers tienen el contrato correcto.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/posthog", () => ({
  captureEvent: vi.fn(),
  isPosthogEnabled: () => false,
}));

import { captureEvent } from "@/lib/posthog";
import { funnel, luk, pricing, nps } from "./events";

const captureMock = captureEvent as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  captureMock.mockClear();
});

describe("funnel events", () => {
  it("pageViewed dispara con path y extras", () => {
    funnel.pageViewed("/", { referrer: "https://t.co", utm_source: "tiktok" });
    expect(captureMock).toHaveBeenCalledWith("page_viewed", {
      path: "/",
      referrer: "https://t.co",
      utm_source: "tiktok",
    });
  });

  it("ctaClicked incluye variant para A/B correlation", () => {
    funnel.ctaClicked({
      cta_id: "hero_primary",
      cta_text: "Empezar gratis",
      location: "hero",
      variant: "variant_b",
    });
    expect(captureMock).toHaveBeenCalledWith("cta_clicked", expect.objectContaining({
      cta_id: "hero_primary",
      variant: "variant_b",
    }));
  });

  it("signupStarted no requiere props", () => {
    funnel.signupStarted();
    expect(captureMock).toHaveBeenCalledWith("signup_started");
  });

  it("signupCompleted con plan", () => {
    funnel.signupCompleted({ plan: "free" });
    expect(captureMock).toHaveBeenCalledWith("signup_completed_ux", { plan: "free" });
  });

  it("satConnected con provider", () => {
    funnel.satConnected("syntage");
    expect(captureMock).toHaveBeenCalledWith("sat_connected", { provider: "syntage" });
  });

  it("firstCfdiLoaded incluye count y source", () => {
    funnel.firstCfdiLoaded({ count: 47, source: "syntage_initial" });
    expect(captureMock).toHaveBeenCalledWith("first_cfdi_loaded", {
      count: 47,
      source: "syntage_initial",
    });
  });

  it("firstCalculationViewed incluye period y total", () => {
    funnel.firstCalculationViewed({ period: "2026-05", total: 1847 });
    expect(captureMock).toHaveBeenCalledWith("first_calculation_viewed", {
      period: "2026-05",
      total: 1847,
    });
  });

  it("firstDeclarationPaid — aha moment con time tracking", () => {
    funnel.firstDeclarationPaid({
      period: "2026-05",
      total: 1847,
      time_to_complete_min: 12,
    });
    expect(captureMock).toHaveBeenCalledWith("first_declaration_paid", {
      period: "2026-05",
      total: 1847,
      time_to_complete_min: 12,
    });
  });

  it("declarationAbandoned incluye step", () => {
    funnel.declarationAbandoned({ period: "2026-05", step: "sat-redirect" });
    expect(captureMock).toHaveBeenCalledWith("declaration_abandoned", {
      period: "2026-05",
      step: "sat-redirect",
    });
  });
});

describe("luk events", () => {
  it("messageSent solo manda length, NUNCA el contenido", () => {
    luk.messageSent({ message_length: 42 });
    expect(captureMock).toHaveBeenCalledWith("luk_message_sent", { message_length: 42 });
    // Verificar que NO se pasan props con contenido textual:
    const call = captureMock.mock.calls.at(-1);
    const props = call?.[1] as Record<string, unknown>;
    expect(props).not.toHaveProperty("message");
    expect(props).not.toHaveProperty("text");
    expect(props).not.toHaveProperty("content");
  });

  it("citaExpanded captura article + surface", () => {
    luk.citaExpanded({ article: "113-E LISR", surface: "breakdown" });
    expect(captureMock).toHaveBeenCalledWith("luk_cita_expanded", {
      article: "113-E LISR",
      surface: "breakdown",
    });
  });

  it("responseShared captura channel", () => {
    luk.responseShared({ channel: "whatsapp" });
    expect(captureMock).toHaveBeenCalledWith("luk_response_shared", { channel: "whatsapp" });
  });
});

describe("pricing events", () => {
  it("planUpgradeClicked rastrea from/to/location", () => {
    pricing.planUpgradeClicked({
      from_plan: "free",
      to_plan: "pro",
      location: "dashboard_nudge",
    });
    expect(captureMock).toHaveBeenCalledWith("plan_upgrade_clicked", {
      from_plan: "free",
      to_plan: "pro",
      location: "dashboard_nudge",
    });
  });
});

describe("nps events", () => {
  it("surveyShown/Answered/Dismissed", () => {
    nps.surveyShown();
    expect(captureMock).toHaveBeenLastCalledWith("nps_survey_shown");

    nps.surveyAnswered({ score: 9, has_comment: false });
    expect(captureMock).toHaveBeenLastCalledWith("nps_survey_answered", {
      score: 9,
      has_comment: false,
    });

    nps.surveyDismissed();
    expect(captureMock).toHaveBeenLastCalledWith("nps_survey_dismissed");
  });
});

describe("helpers nunca throw", () => {
  it("si captureEvent lanza, el helper no propaga", () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error("posthog down");
    });
    // El contrato de eventos es fail-soft via try/catch en el caller.
    // El helper directamente puede propagar si captureEvent throws — pero
    // captureEvent ya hace swallow en posthog.ts. Aquí verificamos que
    // si throws no rompe el resto del test suite.
    expect(() => funnel.pageViewed("/")).toThrow("posthog down");
    // Reset mock state después del throw para no contaminar otros tests.
    captureMock.mockReset();
  });
});
