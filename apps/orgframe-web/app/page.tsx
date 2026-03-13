import Image from "next/image";
import { AppPage, Button, Card, CardContent, CardDescription, CardGrid, CardHeader, CardTitle, PageStack, SectionStack } from "@orgframe/ui";

const features = [
  'Unified inbox for email and social channels',
  'Facility scheduling and blackout management',
  'Program registration and custom forms',
  'Public-facing pages with built-in CMS blocks',
  'Role-based access and organization governance',
  'Calendar views across teams, events, and facilities'
];

export default function HomePage() {
  return (
    <AppPage className="text-text">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-[var(--content-max-width)] items-center justify-between px-4 py-3 md:px-6">
          <a href="#top" className="inline-flex items-center">
            <Image alt="OrgFrame" height={26} priority src="/brand/logo.svg" width={156} />
          </a>
          <div className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#pricing">Pricing</a>
          </div>
          <a href="#cta"><Button className="px-4 py-2">Get Started</Button></a>
        </nav>
      </header>

      <PageStack>
      <section id="top" className="hero-backdrop rounded-card border bg-surface shadow-card">
        <div className="grid gap-8 px-5 py-20 md:grid-cols-2 md:px-8 md:py-24">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">Sports Ops Platform</p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">One operating system for your organization.</h1>
            <p className="max-w-lg text-lg text-text-muted">OrgFrame centralizes scheduling, communication, forms, and team operations so your staff can run faster with less overhead.</p>
            <div id="cta" className="flex flex-wrap gap-3">
              <Button>Book a Demo</Button>
              <Button variant="secondary">Get Started</Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Why OrgFrame</CardTitle>
            </CardHeader>
            <CardContent>
            <ul className="space-y-3 text-sm text-text-muted">
              <li>Replace disconnected tools and spreadsheets.</li>
              <li>Give staff a single source of operational truth.</li>
              <li>Launch better public experiences for families and teams.</li>
            </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <SectionStack className="py-2">
      <section>
        <h2 className="text-2xl font-semibold">Built for growing organizations</h2>
        <CardGrid className="mt-6 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Operate Faster</CardTitle></CardHeader>
            <CardContent><CardDescription>Automate repetitive admin work and streamline day-to-day workflows.</CardDescription></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Communicate Clearly</CardTitle></CardHeader>
            <CardContent><CardDescription>Manage inbound questions and outbound updates from one place.</CardDescription></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Publish Confidently</CardTitle></CardHeader>
            <CardContent><CardDescription>Keep your site, schedules, and forms consistent and up to date.</CardDescription></CardContent>
          </Card>
        </CardGrid>
      </section>
      </SectionStack>

      <section id="features" className="rounded-card border bg-surface-muted/35 p-5 md:p-8">
          <h2 className="text-2xl font-semibold">Features</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="rounded-control border border-border bg-surface px-4 py-3 text-sm">{feature}</li>
            ))}
          </ul>
      </section>

      <section id="how-it-works" className="py-2">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <CardGrid className="mt-6 md:grid-cols-3">
          <Card>
            <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">Step 1</p><CardTitle>Set up your organization</CardTitle></CardHeader>
            <CardContent><CardDescription>Configure roles, facilities, programs, and brand settings.</CardDescription></CardContent>
          </Card>
          <Card>
            <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">Step 2</p><CardTitle>Connect your workflows</CardTitle></CardHeader>
            <CardContent><CardDescription>Manage operations, messages, forms, and schedules from one dashboard.</CardDescription></CardContent>
          </Card>
          <Card>
            <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">Step 3</p><CardTitle>Scale with clarity</CardTitle></CardHeader>
            <CardContent><CardDescription>Use reporting and structure tools to grow programs with confidence.</CardDescription></CardContent>
          </Card>
        </CardGrid>
      </section>

      <section id="testimonials" className="rounded-card border bg-surface-muted/35 p-5 md:p-8">
          <h2 className="text-2xl font-semibold">Testimonials</h2>
          <CardGrid className="mt-6 md:grid-cols-3">
            <Card><CardContent className="pt-6"><CardDescription>"OrgFrame helped us cut admin time every week."</CardDescription></CardContent></Card>
            <Card><CardContent className="pt-6"><CardDescription>"Everything from programs to communications now lives in one place."</CardDescription></CardContent></Card>
            <Card><CardContent className="pt-6"><CardDescription>"Families get clearer updates and our staff works faster."</CardDescription></CardContent></Card>
          </CardGrid>
      </section>

      <section id="pricing" className="py-2">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <CardGrid className="mt-6 md:grid-cols-3">
          <Card><CardHeader><CardTitle>Starter</CardTitle></CardHeader><CardContent><CardDescription>For small clubs getting organized.</CardDescription></CardContent></Card>
          <Card><CardHeader><CardTitle>Pro</CardTitle></CardHeader><CardContent><CardDescription>For growing organizations managing multiple programs.</CardDescription></CardContent></Card>
          <Card><CardHeader><CardTitle>Enterprise</CardTitle></CardHeader><CardContent><CardDescription>For large associations with advanced governance needs.</CardDescription></CardContent></Card>
        </CardGrid>
      </section>

      </PageStack>
      <footer className="mt-3 rounded-card border bg-surface">
        <div className="flex flex-col gap-3 px-5 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-text-muted">© {new Date().getFullYear()} OrgFrame</p>
          <div className="flex gap-4 text-text-muted">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </AppPage>
  );
}
