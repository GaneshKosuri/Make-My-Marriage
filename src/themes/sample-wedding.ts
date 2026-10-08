import type { WebsiteTheme } from "@/modules/weddings/wedding.constants";
import type { PublicWeddingDto } from "@/modules/weddings/wedding.types";

/**
 * Sample content for the /w/[slug] placeholder until Phase 5 loads the real
 * wedding via websiteService.getPublicWebsite (API_DESIGN §69).
 */
export function samplePublicWedding(theme: WebsiteTheme): PublicWeddingDto {
  return {
    brideName: "Princi",
    groomName: "Akshay",
    title: "Akshay ❤️ Princi",
    description: null,
    welcomeMessage: "We would love to celebrate with you. (Sample content — Phase 5.)",
    weddingDate: "2027-02-14",
    timeZone: "Asia/Kolkata",
    coverImageUrl: null,
    theme,
    events: [
      {
        name: "Mehendi",
        startsAt: "2027-02-12T05:00:00.000Z",
        endsAt: "2027-02-12T09:00:00.000Z",
        venueName: "Royal Garden",
        address: "Dehradun",
        dressCode: "Green / Traditional",
        mapUrl: null,
      },
      {
        name: "Wedding",
        startsAt: "2027-02-14T14:30:00.000Z",
        endsAt: null,
        venueName: "XYZ Resort",
        address: "Dehradun, Uttarakhand",
        dressCode: null,
        mapUrl: null,
      },
    ],
    gallery: { enabled: true },
    livestream: { enabled: true, youtubeUrl: null },
  };
}
