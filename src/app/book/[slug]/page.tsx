import { redirect } from 'next/navigation'

interface Props { params: Promise<{ slug: string }> }

// Redirect old /book/[slug] URLs to /book/hire/[slug]
export default async function BookSlugRedirect(props: Props) {
  const params = await props.params;
  redirect(`/book/hire/${params.slug}`)
}
