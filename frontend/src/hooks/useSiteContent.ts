import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_SITE_CONTENT,
  SITE_CONTENT_KEY,
  siteContentService,
  type SiteContent,
} from '../services/site-content.service';

export function useSiteContent() {
  return useQuery({
    queryKey: SITE_CONTENT_KEY,
    queryFn: () => siteContentService.get(),
    staleTime: 5_000,
    placeholderData: DEFAULT_SITE_CONTENT,
  });
}

export function useSiteContentData(): SiteContent {
  const { data } = useSiteContent();
  return data ?? DEFAULT_SITE_CONTENT;
}
