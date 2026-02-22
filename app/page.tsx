"use client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="container mx-auto flex justify-center min-h-screen">
      <div className="grid place-items-center lg:max-w-7xl gap-8 mx-3 md:mx-auto">
        <div className="text-center space-y-6">
          <Image
            src="/sja-logo.webp"
            alt="SJA Voting System Logo"
            width={192}
            height={192}
            className="mx-auto"
          />

          <div className="max-w-6xl mx-auto text-center text-4xl md:text-7xl font-bold">
            <h1>
              Choose your next leaders with
              <span className="text-primary px-2 bg-clip-text">
                SJA Voting System
              </span>
            </h1>
          </div>

          <p className="max-w-3xl mx-auto text-xl text-muted-foreground">
            A modern and secure voting system built by St. Joseph&#39;s Academy
            of Malinao, designed to empower students in selecting their leaders
            with confidence and ease.
          </p>

          <div>
            <Link href="/vote/login">
              <Button
                className="w-5/6 md:w-1/4 font-bold group/arrow"
                size="lg"
              >
                Get Started
                <ArrowRight className="size-5 group-hover/arrow:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-1">
            <p className="text-muted-foreground font-medium">
              Developed by of St. Joseph&#39;s Academy of Malinao.
            </p>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} St. Joseph&#39;s Academy of
              Malinao, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
