// ==============================================================================
// GESTIONNAIRE D'ENVOI D'EMAILS VIA L'API RESEND — RENGER
// ==============================================================================

export interface BookingEmailPayload {
  bookingId: string | number;
  session?: any;
  supabase: any;
}

// Formatage suisse élégant de date (JJ.MM.AAAA)
export function formatSwissDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Fonction utilitaire d'envoi d'e-mail via l'API REST Resend (zéro dépendance)
export async function sendResendEmail({
  apiKey,
  from,
  to,
  subject,
  html,
}: {
  apiKey: string;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ id?: string; error?: string }> {
  const recipients = Array.isArray(to) ? to : [to];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `HTTP ${response.status}`;
    console.error(`[Resend Error] Échec de l'envoi à ${recipients.join(', ')}:`, errorMsg);
    return { error: errorMsg };
  }

  console.log(`[Resend Success] Email envoyé à ${recipients.join(', ')} (id: ${data?.id})`);
  return { id: data?.id };
}

// Template HTML pour le LOCATAIRE
export function getRenterConfirmationTemplate({
  bookingId,
  renterName,
  trailerTitle,
  trailerLocation,
  startDate,
  endDate,
  diffDays,
  totalPaid,
  cautionAmount,
  appUrl,
}: {
  bookingId: string | number;
  renterName: string;
  trailerTitle: string;
  trailerLocation: string;
  startDate: string;
  endDate: string;
  diffDays: number;
  totalPaid: string;
  cautionAmount: number;
  appUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réservation confirmée | Renger</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafaf9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid #e7e5e4;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- EN-TÊTE ÉPURÉ AVEC LOGO ET TYPOGRAPHIE DU SITE -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #f5f5f4;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <a href="${appUrl}" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 10px;">
                            <div style="width: 38px; height: 38px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e7e5e4; text-align: center; line-height: 38px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                              <img src="https://cwifrzajxrcpnqceyxnj.supabase.co/storage/v1/object/public/trailers-images/assets/renger-logo.png" alt="Renger" width="28" height="28" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none;" />
                            </div>
                          </td>
                          <td valign="middle">
                            <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #d85110; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1; display: inline-block;">Renger</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                      ✓ Confirmée
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TITRE & INTRODUCTION -->
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #1c1917; line-height: 1.3;">
                Bonjour ${renterName}, votre réservation est confirmée
              </h1>
              <p style="margin: 0; font-size: 15px; color: #57534e; line-height: 1.5;">
                La réservation <strong>#${bookingId}</strong> a bien été enregistrée et transmise au propriétaire.
              </p>
            </td>
          </tr>

          <!-- RÉCAPITULATIF DE LA RÉSERVATION -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 14px; padding: 20px;" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 14px; border-bottom: 1px solid #e7e5e4;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin-bottom: 4px;">Remorque réservée</div>
                    <div style="font-size: 16px; font-weight: 800; color: #1c1917;">${trailerTitle}</div>
                    ${trailerLocation ? `<div style="font-size: 13px; color: #78716c; margin-top: 2px;">${trailerLocation}</div>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0; border-bottom: 1px solid #e7e5e4;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="50%" valign="top">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin-bottom: 4px;">Départ</div>
                          <div style="font-size: 15px; font-weight: 700; color: #1c1917;">${startDate}</div>
                        </td>
                        <td width="50%" valign="top">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin-bottom: 4px;">Retour</div>
                          <div style="font-size: 15px; font-weight: 700; color: #1c1917;">${endDate}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 6px;">
                          <div style="font-size: 13px; color: #78716c;">Durée : <strong>${diffDays} jour${diffDays > 1 ? 's' : ''}</strong></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 14px; color: #57534e;">Montant total réglé</td>
                        <td align="right" style="font-size: 18px; font-weight: 800; color: #d85110;">${totalPaid} CHF</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #78716c; padding-top: 6px;">Caution (empreinte Stripe non débitée)</td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #059669; padding-top: 6px;">${cautionAmount} CHF (0 CHF débité)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PROCHAINES ÉTAPES -->
          <tr>
            <td style="padding: 16px 32px 24px 32px;">
              <div style="font-size: 13px; font-weight: 700; color: #1c1917; margin-bottom: 12px;">
                Étapes pour votre prise en charge :
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="24" valign="top" style="padding-bottom: 10px; color: #d85110; font-weight: 800; font-size: 14px;">1.</td>
                  <td style="font-size: 13px; color: #44403c; line-height: 1.5; padding-bottom: 10px;">
                    <strong>Contactez le propriétaire</strong> via la messagerie Renger pour convenir de l'heure exacte.
                  </td>
                </tr>
                <tr>
                  <td width="24" valign="top" style="padding-bottom: 10px; color: #d85110; font-weight: 800; font-size: 14px;">2.</td>
                  <td style="font-size: 13px; color: #44403c; line-height: 1.5; padding-bottom: 10px;">
                    <strong>État des lieux photo</strong> (CO art. 257a) à effectuer sur votre smartphone au départ et au retour.
                  </td>
                </tr>
                <tr>
                  <td width="24" valign="top; color: #d85110; font-weight: 800; font-size: 14px;">3.</td>
                  <td style="font-size: 13px; color: #44403c; line-height: 1.5;">
                    <strong>Contrat de location</strong> (CO art. 253) disponible en PDF dans votre profil.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOUTON D'ACTION -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="${appUrl}/profil.html" style="display: inline-block; background-color: #d85110; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 12px; font-weight: 700; font-size: 14px;">
                Accéder à ma réservation →
              </a>
            </td>
          </tr>

          <!-- PIED DE PAGE AVEC INFO@RENGER.CH ET RAPPEL LÉGAL -->
          <tr>
            <td style="background-color: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #a8a29e; line-height: 1.4;">
                Rappel légal : Renger Sàrl agit en qualité d'intermédiaire technique mettant en relation les utilisateurs. Le contrat de location et l'état des lieux lient exclusivement le Bailleur et le Preneur. Renger n'est en aucun cas partie prenante au contrat et décline toute responsabilité quant au matériel loué ou à son utilisation (CGU renger.ch).
              </p>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #78716c;">
                Renger • Plateforme suisse de location de remorques
              </p>
              <p style="margin: 0; font-size: 12px; color: #a8a29e;">
                Besoin d'aide ? Écrivez-nous à <a href="mailto:info@renger.ch" style="color: #d85110; text-decoration: none; font-weight: 600;">info@renger.ch</a> • <a href="${appUrl}" style="color: #78716c; text-decoration: none;">renger.ch</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Template HTML pour le PROPRIÉTAIRE
export function getOwnerNotificationTemplate({
  bookingId,
  ownerName,
  renterName,
  trailerTitle,
  startDate,
  endDate,
  diffDays,
  netEarnings,
  isPro,
  appUrl,
}: {
  bookingId: string | number;
  ownerName: string;
  renterName: string;
  trailerTitle: string;
  startDate: string;
  endDate: string;
  diffDays: number;
  netEarnings: string;
  isPro: boolean;
  appUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle réservation confirmée | Renger</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafaf9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid #e7e5e4;" cellspacing="0" cellpadding="0" border="0">
          
          <!-- EN-TÊTE ÉPURÉ AVEC LOGO ET TYPOGRAPHIE DU SITE -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #f5f5f4;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle">
                    <a href="${appUrl}" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td valign="middle" style="padding-right: 10px;">
                            <div style="width: 38px; height: 38px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e7e5e4; text-align: center; line-height: 38px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                              <img src="https://cwifrzajxrcpnqceyxnj.supabase.co/storage/v1/object/public/trailers-images/assets/renger-logo.png" alt="Renger" width="28" height="28" style="display: inline-block; vertical-align: middle; border: 0; outline: none; text-decoration: none;" />
                            </div>
                          </td>
                          <td valign="middle">
                            <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #d85110; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1; display: inline-block;">Renger</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 12px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px;">
                      Espace Propriétaire
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TITRE & INTRODUCTION -->
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #1c1917; line-height: 1.3;">
                Nouvelle réservation confirmée
              </h1>
              <p style="margin: 0; font-size: 15px; color: #57534e; line-height: 1.5;">
                Votre remorque a été réservée et réglée par <strong>${renterName}</strong>.
              </p>
            </td>
          </tr>

          <!-- DÉTAILS DE LA RÉSERVATION -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 14px; padding: 20px;" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 14px; border-bottom: 1px solid #e7e5e4;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin-bottom: 4px;">Remorque concernée</div>
                    <div style="font-size: 16px; font-weight: 800; color: #1c1917;">${trailerTitle}</div>
                    <div style="font-size: 13px; color: #78716c; margin-top: 2px;">Réservation #${bookingId}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0; border-bottom: 1px solid #e7e5e4;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="50%" valign="top">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin-bottom: 4px;">Du</div>
                          <div style="font-size: 15px; font-weight: 700; color: #1c1917;">${startDate}</div>
                        </td>
                        <td width="50%" valign="top">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #78716c; margin-bottom: 4px;">Au</div>
                          <div style="font-size: 15px; font-weight: 700; color: #1c1917;">${endDate}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 6px;">
                          <div style="font-size: 13px; color: #78716c;">Durée : <strong>${diffDays} jour${diffDays > 1 ? 's' : ''}</strong> • Locataire : <strong>${renterName}</strong></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 14px; color: #57534e;">
                          Vos gains nets perçus
                          <div style="font-size: 11px; color: #78716c; margin-top: 2px;">
                            ${isPro ? '👑 Compte Renger PRO (0% de commission appliquée)' : 'Compte Standard (80% net du prix de base)'}
                          </div>
                        </td>
                        <td align="right" style="font-size: 20px; font-weight: 800; color: #059669;">
                          +${netEarnings} CHF
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONSEIL REMISE DES CLÉS -->
          <tr>
            <td style="padding: 8px 32px 24px 32px;">
              <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 14px 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #1c1917; margin-bottom: 3px;">
                  Remise des clés & restitution
                </div>
                <div style="font-size: 13px; color: #57534e; line-height: 1.5;">
                  Effectuez l'état des lieux photo avec le locataire dès son arrivée via Renger. Dès la validation du retour, vos gains vous sont automatiquement reversés.
                </div>
              </div>
            </td>
          </tr>

          <!-- BOUTON D'ACTION -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="${appUrl}/profil.html" style="display: inline-block; background-color: #1c1917; color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 12px; font-weight: 700; font-size: 14px;">
                Voir la réservation sur mon espace →
              </a>
            </td>
          </tr>

          <!-- PIED DE PAGE AVEC INFO@RENGER.CH ET RAPPEL LÉGAL -->
          <tr>
            <td style="background-color: #fafaf9; border-top: 1px solid #e7e5e4; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #a8a29e; line-height: 1.4;">
                Rappel légal : Renger Sàrl agit en qualité d'intermédiaire technique mettant en relation les utilisateurs. Le contrat de location et l'état des lieux lient exclusivement le Bailleur et le Preneur. Renger n'est en aucun cas partie prenante au contrat et décline toute responsabilité quant au matériel loué ou à son utilisation (CGU renger.ch).
              </p>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #78716c;">
                Renger • Gestion de flotte & Planning des locations en Suisse
              </p>
              <p style="margin: 0; font-size: 12px; color: #a8a29e;">
                Besoin d'aide ? Écrivez-nous à <a href="mailto:info@renger.ch" style="color: #d85110; text-decoration: none; font-weight: 600;">info@renger.ch</a> • <a href="${appUrl}" style="color: #78716c; text-decoration: none;">renger.ch</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Fonction principale appelée depuis stripe-webhook
export async function sendBookingConfirmationEmails({
  supabase,
  bookingId,
  session,
}: BookingEmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('[Resend] Secret RESEND_API_KEY non défini dans Supabase. Aucun email envoyé.');
    return { success: false, error: 'RESEND_API_KEY missing' };
  }

  const configuredFrom = Deno.env.get('RESEND_FROM_EMAIL');
  const fromEmail = configuredFrom
    ? configuredFrom.replace(/info@renger\.ch/gi, 'contact@renger.ch')
    : 'Renger <contact@renger.ch>';
  const appUrl = (Deno.env.get('APP_URL') || 'https://renger.ch').replace(/\/+$/, '');

  // 1. Récupération de la réservation
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bErr || !booking) {
    console.error(`[Resend] Réservation #${bookingId} introuvable :`, bErr?.message);
    return { success: false, error: 'Booking not found' };
  }

  // 2. Récupération de la remorque
  const { data: trailer } = await supabase
    .from('trailers')
    .select('*')
    .eq('id', booking.trailer_id)
    .single();

  const trailerTitle = trailer?.title || `Remorque #${booking.trailer_id}`;
  const trailerLocation = trailer?.location_city || trailer?.location || 'Suisse';

  // 3. Calculs temporels & financiers stricts
  const startDate = formatSwissDate(booking.start_date);
  const endDate = formatSwissDate(booking.end_date);
  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const totalPaid = Number(booking.total_price || 0).toFixed(2);
  const isHeavy = ['cheval', 'voiture', 'refrigere'].includes(trailer?.category) || (trailer?.payload && trailer.payload > 1200);
  const cautionAmount = Number(trailer?.caution) > 0 ? Number(trailer.caution) : (isHeavy ? 400 : 200);

  // 4. Locataire (Email & Nom)
  let renterEmail = session?.customer_details?.email || session?.customer_email || '';
  let renterName = session?.customer_details?.name || 'Locataire';

  if (booking.renter_id) {
    try {
      const { data: renterAuth } = await supabase.auth.admin.getUserById(booking.renter_id);
      if (renterAuth?.user?.email) renterEmail = renterAuth.user.email;
    } catch (e: any) {
      console.warn('[Resend] Erreur lecture auth renter:', e.message);
    }

    try {
      const { data: renterProfile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', booking.renter_id)
        .maybeSingle();
      if (renterProfile?.full_name) {
        renterName = renterProfile.full_name;
      } else if (renterProfile?.username) {
        renterName = `@${renterProfile.username}`;
      }
    } catch (e: any) {
      console.warn('[Resend] Erreur lecture profile renter:', e.message);
    }
  }

  // 5. Propriétaire (Email, Nom & Statut PRO)
  let ownerEmail = '';
  let ownerName = 'Propriétaire';
  let isOwnerPro = false;

  const ownerId = booking.owner_id || trailer?.owner_id || session?.metadata?.owner_id;

  if (ownerId) {
    try {
      const { data: ownerAuth, error: authErr } = await supabase.auth.admin.getUserById(ownerId);
      if (ownerAuth?.user?.email) {
        ownerEmail = ownerAuth.user.email;
      } else if (authErr) {
        console.warn(`[Resend] Propriétaire non trouvé dans Auth (${ownerId}):`, authErr.message);
      }
    } catch (e: any) {
      console.warn('[Resend] Exception lecture auth owner:', e.message);
    }

    try {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('username, full_name, is_pro')
        .eq('id', ownerId)
        .maybeSingle();
      if (ownerProfile) {
        isOwnerPro = !!ownerProfile.is_pro;
        if (ownerProfile.full_name) {
          ownerName = ownerProfile.full_name;
        } else if (ownerProfile.username) {
          ownerName = `@${ownerProfile.username}`;
        }
      }
    } catch (e: any) {
      console.warn('[Resend] Erreur lecture profile owner:', e.message);
    }
  }

  // Calcul du gain net propriétaire (100% si PRO, 80% si standard)
  const baseRental = diffDays * Number(trailer?.price || 0);
  const netEarnings = ((isOwnerPro ? 1.0 : 0.8) * baseRental).toFixed(2);

  // 6. Envoi de l'e-mail au Locataire
  if (renterEmail) {
    const renterHtml = getRenterConfirmationTemplate({
      bookingId,
      renterName,
      trailerTitle,
      trailerLocation,
      startDate,
      endDate,
      diffDays,
      totalPaid,
      cautionAmount,
      appUrl,
    });

    await sendResendEmail({
      apiKey,
      from: fromEmail,
      to: renterEmail,
      subject: `Confirmation de votre réservation Renger #${bookingId} - ${trailerTitle}`,
      html: renterHtml,
    });
  } else {
    console.warn(`[Resend] Pas d'adresse e-mail trouvée pour le locataire de la réservation #${bookingId}`);
  }

  // 7. Envoi de l'e-mail au Propriétaire
  if (ownerEmail) {
    const ownerHtml = getOwnerNotificationTemplate({
      bookingId,
      ownerName,
      renterName,
      trailerTitle,
      startDate,
      endDate,
      diffDays,
      netEarnings,
      isPro: isOwnerPro,
      appUrl,
    });

    await sendResendEmail({
      apiKey,
      from: fromEmail,
      to: ownerEmail,
      subject: `Nouvelle réservation confirmée pour votre remorque #${bookingId} - ${trailerTitle}`,
      html: ownerHtml,
    });
  } else {
    console.warn(`[Resend] Pas d'adresse e-mail trouvée pour le propriétaire de la réservation #${bookingId}`);
  }

  return { success: true };
}
