import { useParams, useSearchParams } from 'react-router-dom';
import { SearchResultView } from '@/components/search/SearchResultView';

export function SearchResult() {
  const { messageId } = useParams<{ messageId: string }>();
  const [searchParams] = useSearchParams();
  
  const messageType = searchParams.get('type') as 'channel' | 'directMessage' | null;
  const channelId = searchParams.get('channelId');
  const dmUserId = searchParams.get('dmUserId');
  const dmUserName = searchParams.get('dmUserName');

  const handleBack = () => {
    window.history.back();
  };

  return (
    <SearchResultView
      messageId={messageId || ''}
      messageType={messageType}
      channelId={channelId}
      dmUserName={dmUserName}
      onBack={handleBack}
    />
  );
}