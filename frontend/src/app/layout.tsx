import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'JobGateway - Smart Job Application System',
  description: 'AI-powered smart job application platform with ATS matching, recruiter outreach, resume builder, video intro, and application tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navigation>{children}</Navigation>
      </body>
    </html>
  );
}
