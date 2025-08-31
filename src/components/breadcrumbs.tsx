import React from "react";
import { Link } from "react-router-dom";

interface BreadcrumbsProps {
items: { label: string; }[] | ({ label: string; to: string; } | { label: any; })[] | ({ label: string; to: string; } | { label: string; })[];
}

const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  return (`
    <nav className="breadcrumbs">
      {items.map((item, index) => (
        <span key={index}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
          {index < items.length - 1 && " / "}
        </span>
      ))}
    </nav>
  `);
};

export default Breadcrumbs;
