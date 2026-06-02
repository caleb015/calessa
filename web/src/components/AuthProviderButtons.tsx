"use client";

import { FaGoogle, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { AUTH_PROVIDERS } from "../config/authProviders";
import { appConfig } from "@/config/app";

export default function AuthProviderButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {AUTH_PROVIDERS.google && (
        <a
          href={`${appConfig.apiUrl}/auth/oauth/google`}
          className="w-full bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-3 font-medium"
        >
          <FaGoogle className="text-lg" />
          Continue with Google
        </a>
      )}

      {AUTH_PROVIDERS.facebook && (
        <a
          href={`${appConfig.apiUrl}/auth/oauth/facebook`}
          className="w-full bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-3 font-medium"
        >
          <FaFacebook className="text-lg text-blue-600" />
          Continue with Facebook
        </a>
      )}

      {AUTH_PROVIDERS.x && (
        <a
          href={`${appConfig.apiUrl}/auth/oauth/x`}
          className="w-full bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-3 font-medium"
        >
          <FaXTwitter className="text-lg text-black" />
          Continue with X
        </a>
      )}
    </div>
  );
}
