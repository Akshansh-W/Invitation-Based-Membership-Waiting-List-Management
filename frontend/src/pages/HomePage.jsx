import { useEffect, useState } from "react";
import NonRegisteredUserHeader from "@/components/HomeComponents/NonRegisteredUserHeader.jsx";
import RegisteredUserHeader from "@/components/HomeComponents/RegisteredUserHeader.jsx";
import PostCard from "@/components/HomeComponents/Postcard.jsx";
import backendUrl from "@/config/api.js";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState("");

  const handleLogout = () => {
    setUser(null);
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/api/auth/getUser`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          setUser(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to fetch user details.");
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Failed to load current user:", error);
      } finally {
        setAuthLoading(false);
      }
    };

    const fetchPosts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${backendUrl}/api/posts`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Unable to fetch artwork posts.");
        }

        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error("Failed to load posts:", error);
        setPostsError("Unable to load artwork. Please try again.");
      } finally {
        setPostsLoading(false);
      }
    };

    fetchCurrentUser();
    fetchPosts();
  }, []);

  const isRegistered = Boolean(user);
  const isMember = user?.role === "USER" && user?.membership_status === "MEMBER";

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      {authLoading ? (
        <header className="flex h-16 items-center justify-center bg-white shadow-sm">
          <p className="text-sm text-green-800">Loading ArtSpace...</p>
        </header>
      ) : isRegistered ? (
        <RegisteredUserHeader user={user} onLogout={handleLogout} />
      ) : (
        <NonRegisteredUserHeader />
      )}

      <main className="mx-auto max-w-7xl px-5 py-10">
        {/* Hero section */}
        <section className="mb-10 grid items-center gap-8 overflow-hidden rounded-2xl bg-green-100 px-6 py-8 sm:px-10 md:grid-cols-2 md:py-10">
          {/* Text content */}
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-green-800">A community for creativity</p>

            <h2 className="mb-3 text-3xl font-bold text-green-950 sm:text-4xl">Discover art. Share inspiration.</h2>

            <p className="max-w-2xl text-sm leading-6 text-green-900 sm:text-base">
              Explore artwork from creative minds, discover new perspectives, and become part of an artistic community.
            </p>

            <a
              href="#artworks"
              className="mt-6 inline-block rounded-lg bg-green-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-900"
            >
              Explore Artwork
            </a>
          </div>

          {/* Artwork image */}
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1000&q=85"
              alt="Colorful abstract artwork in an art gallery"
              className="h-56 w-full rounded-xl object-cover shadow-md sm:h-72"
            />

            <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-4 py-2 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-medium text-green-800">Inspiration starts here</p>
            </div>
          </div>
        </section>

        {/* Artwork section */}
        <section id="artworks">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Explore Artwork</h2>

            <p className="mt-1 text-sm text-gray-500">Discover creations shared by our community.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {postsLoading ? (
              <p className="col-span-full py-10 text-center text-gray-500">Loading artwork...</p>
            ) : postsError ? (
              <p className="col-span-full py-10 text-center text-red-600">{postsError}</p>
            ) : posts.length === 0 ? (
              <p className="col-span-full py-10 text-center text-gray-500">No artwork has been posted yet.</p>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isRegistered={isRegistered}
                  isMember={isMember}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
