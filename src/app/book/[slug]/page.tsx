import { redirect } from 'next/navigation'

interface Props { params: { slug: string } }

// Redirect old /book/[slug] URLs to /book/hire/[slug]
export default function BookSlugRedirect({ params }: Props) {
  redirect(`/book/hire/${params.slug}`)
}
