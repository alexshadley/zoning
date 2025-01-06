import { usePathname } from "next/navigation";
import React from "react";

const TwitterShareButton = ({
  url,
  text = "Check this out!",
  hashtags = [],
  via = "",
  className = "",
}: {
  url?: string;
  text?: string;
  hashtags?: string[];
  via?: string;
  className?: string;
}) => {
  const pathname = usePathname();
  const path = url ?? pathname;

  const handleShare = (e) => {
    e.preventDefault();

    // Construct the share URL
    const shareUrl = new URL("https://twitter.com/intent/tweet");
    const params = new URLSearchParams({
      url: path,
      text: text,
    });

    if (hashtags.length > 0) {
      params.append("hashtags", hashtags.join(","));
    }

    if (via) {
      params.append("via", via);
    }

    shareUrl.search = params.toString();

    // Open in a new tab
    window.open(shareUrl.toString(), "_blank");
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-400 rounded-lg hover:bg-blue-500 transition-colors ${className}`}
      aria-label="Share on Twitter"
    >
      <span>Share on Twitter</span>
    </button>
  );
};

export default TwitterShareButton;
