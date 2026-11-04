import { useState } from "react";
import { MessageCircle, Users, X, Send } from "lucide-react";
import backendUrl from "@/config/api.js";

export default function PostCard({ post, isRegistered, isMember }) {
  const [liked, setLiked] = useState(Boolean(post.likedByCurrentUser));
  const [likes, setLikes] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState("");

  const commentCount = comments.length;

  const handleLike = async () => {
    if (!isRegistered) {
      setError("Please log in to like artwork.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to like artwork.");
      return;
    }

    setError("");
    setIsLiking(true);

    try {
      const response = await fetch(`${backendUrl}/api/posts/${encodeURIComponent(post.id)}/like`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update your like.");
      }

      setLiked(data.liked);
      setLikes(data.likes);
    } catch (likeError) {
      setError(likeError.message || "Unable to connect to the server.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!commentText.trim() || !isMember) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to comment.");
      return;
    }

    setError("");
    setIsSubmittingComment(true);

    try {
      const response = await fetch(`${backendUrl}/api/posts/${encodeURIComponent(post.id)}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add your comment.");
      }

      setComments((current) => [...current, data.comment]);
      setCommentText("");
    } catch (commentError) {
      setError(commentError.message || "Unable to connect to the server.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <article className="overflow-visible rounded-xl border border-green-100 bg-white shadow-sm transition hover:shadow-md">
      <img src={post.image} alt={post.title} className="h-64 w-full rounded-t-xl object-cover" />

      <div className="p-4">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-gray-800">{post.title}</h2>
          <p className="text-sm text-green-700">By {post.artist}</p>
        </div>

        <p className="mb-4 text-sm leading-6 text-gray-600">{post.description}</p>

        {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex items-center justify-between border-t border-green-50 pt-3">
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-wait disabled:opacity-70 ${
              liked ? "bg-green-100 text-green-800" : "bg-gray-50 text-gray-700 hover:bg-green-50"
            }`}
          >
            {isLiking ? "Saving..." : liked ? "♥ Liked" : "♡ Like"} · {likes}
          </button>

          {isRegistered ? (
            <div className="relative">
              <button
                onClick={() => setShowComments((previous) => !previous)}
                aria-label={`View ${commentCount} comments on ${post.title}`}
                aria-expanded={showComments}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  showComments ? "bg-green-100 text-green-800" : "text-green-800 hover:bg-green-50"
                }`}
              >
                <MessageCircle size={19} />
                <span>{commentCount}</span>
              </button>

              {showComments && (
                <>
                  {/* Click outside to close */}
                  <button aria-label="Close comments popup" onClick={() => setShowComments(false)} className="fixed inset-0 z-40 cursor-default" />

                  <section className="absolute bottom-12 right-0 z-50 flex h-80 w-80 max-w-[85vw] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-xl sm:w-96">
                    {/* Popup header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">Comments</h3>
                        <p className="text-xs text-gray-500">
                          {commentCount} {commentCount === 1 ? "comment" : "comments"}
                        </p>
                      </div>

                      <button
                        onClick={() => setShowComments(false)}
                        aria-label="Close comments"
                        className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Scrollable comments */}
                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                      {comments.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <MessageCircle size={30} className="mb-2 text-green-700" />
                          <p className="text-sm font-medium text-gray-700">No comments yet</p>
                          <p className="mt-1 text-xs text-gray-500">Start the conversation!</p>
                        </div>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment._id} className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800">
                              {comment.author_name?.charAt(0).toUpperCase() || "U"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-700">
                                <span className="mr-2 font-semibold text-gray-900">{comment.author_name || "User"}</span>
                                {comment.text}
                              </p>

                              {comment.created_at && (
                                <p className="mt-1 text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Comment input */}
                    {isMember ? (
                      <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 border-t border-gray-100 p-3">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          maxLength={1000}
                          className="min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-600"
                        />

                        <button
                          type="submit"
                          disabled={!commentText.trim() || isSubmittingComment}
                          aria-label="Send comment"
                          className="rounded-full p-2 text-green-800 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSubmittingComment ? <span className="text-xs">...</span> : <Send size={18} />}
                        </button>
                      </form>
                    ) : (
                      <p className="border-t border-gray-100 p-3 text-center text-xs text-gray-500">
                        Only ArtSpace members can add comments.
                      </p>
                    )}
                  </section>
                </>
              )}
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100"
            >
              <Users size={16} />
              Log in to Comment
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
