import type { ReactNode } from 'react'

export const LEGAL_ROUTES = ['#/confidentialite', '#/mentions-legales'] as const
export type LegalRoute = (typeof LEGAL_ROUTES)[number]

interface Props {
  route: LegalRoute
  onBack: () => void
}

const UPDATED = '6 octobre 2026'

// Something still to fill in or confirm before the app is opened to other people.
function Todo({ children }: { children: ReactNode }) {
  return <span className="rounded-sm border border-dashed border-line bg-tint px-1 text-fg">{children}</span>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-wide text-base font-bold text-fg">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-fg">{children}</div>
    </section>
  )
}

function Privacy() {
  return (
    <>
      <Section title="Qui s’occupe de tes données">
        <p>
          Movie Night est un projet personnel et non commercial de <Todo>Prénom Nom</Todo>. Pour toute question :{' '}
          <Todo>adresse e-mail de contact</Todo>.
        </p>
      </Section>

      <Section title="Ce que l’app garde">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Ton compte : ton adresse e-mail. Si tu te connectes avec Google, le nom et la photo de ton compte Google.
          </li>
          <li>
            Ta bibliothèque : titres vus, notes, avis, favoris, liste « À voir », titres écartés et derniers tirages.
          </li>
          <li>Tes réglages : filtres, plateformes, pays et apparence.</li>
        </ul>
        <p>Pas de publicité, pas de traceurs, et rien n’est vendu.</p>
      </Section>

      <Section title="Pourquoi">
        <p>
          Uniquement pour faire fonctionner l’app : te connecter, retrouver ta bibliothèque sur tous tes appareils, et ne
          plus te proposer ce que tu as déjà vu ou écarté. C’est le service que tu demandes en créant un compte (base
          légale : l’exécution de ce service).
        </p>
      </Section>

      <Section title="Qui d’autre y a accès">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Supabase, qui héberge la base de données et gère la connexion, sur des serveurs situés dans l’Union
            européenne <Todo>région exacte à confirmer</Todo>.
          </li>
          <li>GitHub (GitHub Pages), qui héberge le site et garde des journaux techniques, comme l’adresse IP, pour sa sécurité.</li>
          <li>Google, seulement si tu choisis de te connecter avec ton compte Google.</li>
          <li>
            TMDB reçoit les recherches de films et séries faites par l’app, sans aucune information sur toi. Si tu relies
            ton compte TMDB, les notes que tu choisis d’envoyer y sont publiées avec ton compte TMDB.
          </li>
        </ul>
      </Section>

      <Section title="Combien de temps">
        <p>
          Tant que ton compte existe. Si tu le supprimes, toutes tes données sont effacées{' '}
          <Todo>délai à préciser, par exemple sous 30 jours, sauvegardes comprises</Todo>.
        </p>
        <p>
          <Todo>À décider : supprimer les comptes inactifs depuis 3 ans, après un e-mail de prévenance.</Todo>
        </p>
      </Section>

      <Section title="Sur ton appareil">
        <p>
          L’app garde une copie de tes données dans ton navigateur (stockage local) pour aller plus vite et fonctionner
          sans connexion. Il n’y a ni cookies publicitaires ni mesure d’audience : aucun bandeau de consentement n’est donc
          nécessaire.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu peux à tout moment consulter, corriger, télécharger ou supprimer tes données, et t’opposer à leur
          utilisation. Le téléchargement et la suppression se feront depuis Réglages <Todo>à venir avec les comptes</Todo>
          ; pour le reste, écris à <Todo>adresse e-mail de contact</Todo>.
        </p>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux t’adresser à la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="underline underline-offset-4">
            cnil.fr
          </a>
          ).
        </p>
      </Section>

      <Section title="Âge">
        <p>
          Movie Night s’adresse aux personnes de 15 ans et plus. <Todo>à valider</Todo>
        </p>
      </Section>

      <Section title="Mises à jour">
        <p>Si cette politique change, la date en haut de page change aussi. Un changement important te sera signalé dans l’app.</p>
      </Section>
    </>
  )
}

function LegalNotice() {
  return (
    <>
      <Section title="Éditeur">
        <p>
          Movie Night est un site personnel, édité à titre non professionnel par <Todo>Prénom Nom</Todo>. Contact :{' '}
          <Todo>adresse e-mail de contact</Todo>.
        </p>
        <p>
          <Todo>
            Option prévue par la loi pour un particulier : ne publier ici que le nom de l’hébergeur, à qui tes coordonnées
            sont alors confiées.
          </Todo>
        </p>
      </Section>

      <Section title="Hébergement du site">
        <p>
          GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis. <Todo>à vérifier</Todo>
        </p>
      </Section>

      <Section title="Hébergement des données">
        <p>
          Supabase, Inc. <Todo>adresse à vérifier</Todo>, avec des serveurs situés dans l’Union européenne.
        </p>
      </Section>

      <Section title="Contenus">
        <p>
          Les informations sur les films et séries viennent de TMDB (The Movie Database), et les disponibilités sur les
          plateformes de JustWatch. Les affiches, titres et marques appartiennent à leurs ayants droit.
        </p>
        <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </Section>
    </>
  )
}

export default function LegalPage({ route, onBack }: Props) {
  const isPrivacy = route === '#/confidentialite'
  return (
    <article className="mx-auto max-w-prose space-y-6">
      <button onClick={onBack} className="text-sm text-muted underline underline-offset-4 hover:text-fg">
        ← Retour aux réglages
      </button>

      <header className="space-y-2">
        <h1 className="font-poster text-3xl text-fg">{isPrivacy ? 'Politique de confidentialité' : 'Mentions légales'}</h1>
        <p className="text-sm text-muted">Mise à jour le {UPDATED}.</p>
        <p className="rounded-sm border border-dashed border-line bg-tint px-3 py-2 text-sm text-fg">
          Brouillon : les passages encadrés sont à compléter ou à vérifier avant d’ouvrir l’app à d’autres personnes.
        </p>
      </header>

      {isPrivacy ? <Privacy /> : <LegalNotice />}
    </article>
  )
}
